// ============================================================
// 📁 src/controllers/Ventas/ClientesController.js
// ✅ Correcciones:
//   1. getClientes / getClienteById: usa client dedicado (bug cursor)
//   2. insertCliente / updateCliente: validaciones de campos requeridos
// ============================================================
const { pool } = require("../../db");
const { registrarBitacora, findUserId } = require("../../utils/bitacora");

// ─── Helper de validación ────────────────────────────────────
function validar(data) {
  const { nombre_cliente, telefono, id_tipo_cliente, id_estado_cliente, correo_electronico, rtn } = data;
  const errores = [];

  if (!nombre_cliente || String(nombre_cliente).trim() === "")
    errores.push("El nombre del cliente es obligatorio.");
  else if (String(nombre_cliente).trim().length < 3)
    errores.push("El nombre debe tener al menos 3 caracteres.");
  else if (String(nombre_cliente).trim().length > 150)
    errores.push("El nombre no puede exceder 150 caracteres.");
  else if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(String(nombre_cliente).trim()))
    errores.push("El nombre solo debe contener letras y espacios.");


  if (!id_tipo_cliente || id_tipo_cliente === "0" || id_tipo_cliente === 0)
    errores.push("El tipo de cliente es obligatorio.");

  if (!id_estado_cliente || id_estado_cliente === "0" || id_estado_cliente === 0)
    errores.push("El estado del cliente es obligatorio.");

  if (!telefono || String(telefono).trim() === "") {
    errores.push("El teléfono es obligatorio.");
  } else {
    const tel = String(telefono).replace(/-/g, "");
    if (!/^[0-9]{8}$/.test(tel))
      errores.push("El teléfono debe tener 8 dígitos (ej. 9999-9999).");
  }

  if (!correo_electronico || String(correo_electronico).trim() === "") {
    errores.push("El correo electrónico es obligatorio.");
  } else {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(correo_electronico))
      errores.push("El correo electrónico no tiene un formato válido.");
  }

  if (!rtn || String(rtn).trim() === "") {
    errores.push("El RTN / ID es obligatorio.");
  } else {
    const limpio = String(rtn).replace(/-/g, "");
    if (!/^[0-9]{13,14}$/.test(limpio))
      errores.push("El RTN / ID debe tener entre 13 y 14 dígitos numéricos.");
  }

  if (!data.direccion || String(data.direccion).trim() === "")
    errores.push("La dirección es obligatoria.");
  else if (String(data.direccion).trim().length < 5)
    errores.push("La dirección debe tener al menos 5 caracteres.");
  else if (String(data.direccion).trim().length > 250)
    errores.push("La dirección no puede exceder 250 caracteres.");

  return errores;
}

// ============================================================
// 🔹 LISTAR TODOS LOS CLIENTES
// Bug fix: usar client dedicado para cursor (igual que PersonasController)
// ============================================================
exports.getClientes = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CALL ventasyreserva.sp_listar_clientes('cur_clientes')`);
    const result = await client.query(`FETCH ALL FROM cur_clientes`);
    await client.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => { });
    console.error("❌ Error al listar clientes:", error);
    res.status(500).json({ error: "Error al obtener la lista de clientes." });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 OBTENER CLIENTE POR ID
// Bug fix: usar client dedicado para cursor
// ============================================================
exports.getClienteById = async (req, res) => {
  const { id_cliente } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL ventasyreserva.sp_buscar_clientes_por_id($1, 'cur_cliente')`,
      [id_cliente]
    );
    const result = await client.query(`FETCH ALL FROM cur_cliente`);
    await client.query("COMMIT");

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Cliente no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => { });
    console.error("❌ Error al obtener cliente:", error);
    res.status(500).json({ error: "Error al obtener el cliente solicitado." });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 INSERTAR CLIENTE — con validaciones backend
// ============================================================
exports.insertCliente = async (req, res) => {
  const {
    nombre_cliente,
    rtn,
    id_tipo_cliente,
    direccion,
    telefono,
    correo_electronico,
    id_estado_cliente,
  } = req.body;

  const errores = validar(req.body);
  if (errores.length > 0)
    return res.status(400).json({ error: errores.join(" | ") });

  try {
    // 🔒 Validar unicidad de RTN antes de insertar
    if (rtn) {
      const existeRTN = await pool.query(
        `SELECT id_cliente FROM ventasyreserva.clientes WHERE rtn = $1`,
        [String(rtn).trim()]
      );
      if (existeRTN.rowCount > 0)
        return res.status(409).json({ error: "Ya existe un cliente registrado con ese RTN / ID." });
    }

    await pool.query(
      `CALL ventasyreserva.sp_insertar_clientes($1, $2, $3, $4, $5, $6, $7)`,
      [
        String(nombre_cliente).trim(),
        rtn ? String(rtn).trim() : null,
        id_tipo_cliente,
        direccion ? String(direccion).trim() : null,
        String(telefono).trim(),
        correo_electronico ? String(correo_electronico).trim().toLowerCase() : null,
        id_estado_cliente,
      ]
    );

    res.status(201).json({ message: "✅ Cliente insertado correctamente" });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "ventasyreserva.clientes",
      accion: "INSERT",
      descripcion: `Cliente "${String(nombre_cliente).trim()}" creado por ${userEmail || "desconocido"}`,
      detalle: { nombre_cliente, rtn, telefono, correo_electronico, direccion, id_tipo_cliente, id_estado_cliente },
    });
  } catch (error) {
    console.error("❌ Error al insertar cliente:", error);
    const msg = error.message?.includes("value too long")
      ? "El valor ingresado excede el límite de caracteres permitido."
      : "Error interno del servidor. Contacte al administrador.";
    res.status(500).json({ error: msg });
  }
};

// ============================================================
// 🔹 ACTUALIZAR CLIENTE — con validaciones backend
// ============================================================
exports.updateCliente = async (req, res) => {
  const { id_cliente } = req.params;
  const {
    nombre_cliente,
    rtn,
    id_tipo_cliente,
    direccion,
    telefono,
    correo_electronico,
    id_estado_cliente,
  } = req.body;

  const errores = validar(req.body);
  if (errores.length > 0)
    return res.status(400).json({ error: errores.join(" | ") });

  try {
    // 🔒 Validar unicidad de RTN (excluyendo el cliente actual)
    if (rtn) {
      const existeRTN = await pool.query(
        `SELECT id_cliente FROM ventasyreserva.clientes WHERE rtn = $1 AND id_cliente != $2`,
        [String(rtn).trim(), id_cliente]
      );
      if (existeRTN.rowCount > 0)
        return res.status(409).json({ error: "Ya existe otro cliente registrado con ese RTN / ID." });
    }

    await pool.query(
      `CALL ventasyreserva.sp_actualizar_clientes($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id_cliente,
        String(nombre_cliente).trim(),
        rtn ? String(rtn).trim() : null,
        id_tipo_cliente,
        direccion ? String(direccion).trim() : null,
        String(telefono).trim(),
        correo_electronico ? String(correo_electronico).trim().toLowerCase() : null,
        id_estado_cliente,
      ]
    );

    res.json({ message: "✅ Cliente actualizado correctamente" });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "ventasyreserva.clientes",
      accion: "UPDATE",
      descripcion: `Cliente ID ${id_cliente} actualizado por ${userEmail || "desconocido"}`,
      detalle: { id_cliente, nombre_cliente, rtn, telefono, correo_electronico, direccion, id_tipo_cliente, id_estado_cliente },
    });
  } catch (error) {
    console.error("❌ Error al actualizar cliente:", error);
    const msg = error.message?.includes("value too long")
      ? "El valor ingresado excede el límite de caracteres permitido."
      : "Error interno del servidor. Contacte al administrador.";
    res.status(500).json({ error: msg });
  }
};

// ============================================================
// 🔹 ELIMINAR CLIENTE
// ============================================================
exports.deleteCliente = async (req, res) => {
  const { id_cliente } = req.params;

  if (!id_cliente)
    return res.status(400).json({ error: "ID de cliente requerido" });

  try {
    await pool.query(`CALL ventasyreserva.sp_eliminar_clientes($1)`, [id_cliente]);
    res.json({ message: "🗑️ Cliente eliminado correctamente" });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "ventasyreserva.clientes",
      accion: "DELETE",
      descripcion: `Cliente ID ${id_cliente} eliminado por ${userEmail || "desconocido"}`,
      detalle: { id_cliente },
    });
  } catch (error) {
    console.error("❌ Error al eliminar cliente:", error);
    const msg = error.message?.includes("violates foreign key")
      ? "No se puede eliminar el cliente porque tiene registros asociados (pedidos, facturas, etc.)."
      : "Error al eliminar el cliente. Contacte al administrador.";
    res.status(500).json({ error: msg });
  }
};
