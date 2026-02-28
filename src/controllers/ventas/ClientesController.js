// ============================================================
// 📁 src/controllers/Ventas/ClientesController.js
// ✅ Correcciones:
//   1. getClientes / getClienteById: usa client dedicado (bug cursor)
//   2. insertCliente / updateCliente: validaciones de campos requeridos
// ============================================================
const { pool } = require("../../db");

// ─── Helper de validación ────────────────────────────────────
function validar(data) {
  const { nombre_cliente, telefono, id_tipo_cliente, id_estado_cliente, correo_electronico, rtn } = data;
  const errores = [];

  if (!nombre_cliente || String(nombre_cliente).trim() === "")
    errores.push("El nombre del cliente es obligatorio.");
  else if (String(nombre_cliente).trim().length < 3)
    errores.push("El nombre debe tener al menos 3 caracteres.");
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

  if (correo_electronico && String(correo_electronico).trim() !== "") {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(correo_electronico))
      errores.push("El correo electrónico no tiene un formato válido.");
  }

  if (rtn && String(rtn).trim() !== "") {
    if (!/^[0-9]{14}$/.test(rtn))
      errores.push("El RTN debe tener exactamente 14 dígitos numéricos.");
  }

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
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    console.error("❌ Error al insertar cliente:", error);
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    console.error("❌ Error al actualizar cliente:", error);
    res.status(500).json({ error: error.message });
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
  } catch (error) {
    console.error("❌ Error al eliminar cliente:", error);
    res.status(500).json({ error: error.message });
  }
};
