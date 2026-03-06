// ============================================================
// 📁 src/controllers/compras/ProveedoresController.js
// ============================================================

const { pool } = require("../../db");
const { registrarBitacora, findUserId } = require("../../utils/bitacora");

// ============================================================
// 🔹 LISTAR PROVEEDORES
// ============================================================
exports.getProveedores = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_proveedor,
        p.nombre,
        p.rtn,
        p.telefono,
        p.correo,
        p.direccion,
        p.id_estado_proveedor,
        e.nombre_estado
      FROM compras.tbl_proveedores p
      LEFT JOIN mantenimiento.tbl_estado_proveedor e 
        ON p.id_estado_proveedor = e.id_estado_proveedor
      ORDER BY p.id_proveedor;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error al listar proveedores:", error);
    res.status(500).json({ error: "Error al listar proveedores" });
  }
};

// ============================================================
// 🔹 INSERTAR PROVEEDOR (con validación y estado por defecto)
// ============================================================
exports.insertProveedor = async (req, res) => {
  try {
    let { nombre, rtn, telefono, correo, direccion, id_estado_proveedor, modo } = req.body;

    // 🛡️ Sanitización
    nombre = nombre ? nombre.trim() : null;
    rtn = rtn ? rtn.trim() : null;
    telefono = telefono ? telefono.trim() : null;
    correo = correo ? correo.trim().toLowerCase() : null;
    direccion = direccion ? direccion.trim() : null;

    // 🛡️ Validaciones
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ error: "El nombre del proveedor es obligatorio (mín 3 caracteres)." });
    }

    if (!rtn) {
      return res.status(400).json({ error: "El RTN es obligatorio." });
    }
    const rtnDigitos = rtn.replace(/-/g, "");
    if (!/^\d{13,14}$/.test(rtnDigitos)) {
      return res.status(400).json({ error: "El RTN debe tener entre 13 y 14 dígitos numéricos." });
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: "El correo electrónico no tiene un formato válido." });
    }

    if (telefono) {
      const telDigitos = telefono.replace(/[-+\s]/g, "");
      if (!/^\d{8,}$/.test(telDigitos)) {
        return res.status(400).json({ error: "El teléfono debe tener al menos 8 dígitos." });
      }
    }

    const estadoFinal = id_estado_proveedor || 1;

    // Verificar duplicado
    const existe = await pool.query(
      `SELECT id_proveedor FROM compras.tbl_proveedores WHERE LOWER(nombre)=LOWER($1) OR rtn=$2`,
      [nombre, rtn]
    );

    if (existe.rows.length > 0) {
      if (modo === "orden") {
        return res.json({
          message: "Proveedor ya existente, redirigiendo a creación de orden.",
          id_proveedor: existe.rows[0].id_proveedor,
          existente: true,
        });
      }
      return res.status(400).json({ error: "Ya existe un proveedor con ese nombre o RTN." });
    }

    // Insertar nuevo proveedor
    const result = await pool.query(
      `INSERT INTO compras.tbl_proveedores 
       (nombre, rtn, telefono, correo, direccion, id_estado_proveedor)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_proveedor`,
      [nombre, rtn, telefono, correo, direccion, estadoFinal]
    );

    res.status(201).json({
      message: "✅ Proveedor agregado correctamente",
      id_proveedor: result.rows[0].id_proveedor,
    });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "compras.tbl_proveedores",
      accion: "INSERT",
      descripcion: `Proveedor "${nombre}" creado por ${userEmail || "desconocido"}`,
      detalle: { nombre, rtn, telefono, correo, id_proveedor: result.rows[0].id_proveedor },
    });
  } catch (error) {
    console.error("❌ Error al insertar proveedor:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR PROVEEDOR
// ============================================================
exports.updateProveedor = async (req, res) => {
  try {
    const { id_proveedor } = req.params;
    let { nombre, rtn, telefono, correo, direccion, id_estado_proveedor } = req.body;

    // 🛡️ Sanitización
    nombre = nombre ? nombre.trim() : null;
    rtn = rtn ? rtn.trim() : null;
    telefono = telefono ? telefono.trim() : null;
    correo = correo ? correo.trim().toLowerCase() : null;
    direccion = direccion ? direccion.trim() : null;

    // 🛡️ Validaciones
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ error: "El nombre del proveedor es obligatorio (mín 3 caracteres)." });
    }

    if (!rtn) {
      return res.status(400).json({ error: "El RTN es obligatorio." });
    }
    const rtnDigitos = rtn.replace(/-/g, "");
    if (!/^\d{13,14}$/.test(rtnDigitos)) {
      return res.status(400).json({ error: "El RTN debe tener entre 13 y 14 dígitos numéricos." });
    }

    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      return res.status(400).json({ error: "El correo electrónico no tiene un formato válido." });
    }

    if (telefono) {
      const telDigitos = telefono.replace(/[-+\s]/g, "");
      if (!/^\d{8,}$/.test(telDigitos)) {
        return res.status(400).json({ error: "El teléfono debe tener al menos 8 dígitos." });
      }
    }

    const result = await pool.query(
      `UPDATE compras.tbl_proveedores
       SET nombre=$1, rtn=$2, telefono=$3, correo=$4, direccion=$5, id_estado_proveedor=$6
       WHERE id_proveedor=$7`,
      [nombre, rtn, telefono, correo, direccion, id_estado_proveedor, id_proveedor]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Proveedor no encontrado" });

    res.json({ message: "✅ Proveedor actualizado correctamente" });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    await registrarBitacora({
      id_usuario,
      tabla: "compras.tbl_proveedores",
      accion: "UPDATE",
      descripcion: `Proveedor ID ${id_proveedor} actualizado por ${userEmail || "desconocido"}`,
      detalle: { id_proveedor, nombre, rtn, telefono, correo },
    });
  } catch (error) {
    console.error("❌ Error al actualizar proveedor:", error);
    res.status(500).json({ error: "Error al actualizar proveedor" });
  }
};

// ============================================================
// 🔹 ELIMINAR PROVEEDOR
// ============================================================
exports.deleteProveedor = async (req, res) => {
  const { id } = req.params;
  try {
    // Datos antes de eliminar para bitácora
    const prevData = await pool.query(
      "SELECT nombre, rtn FROM compras.tbl_proveedores WHERE id_proveedor=$1", [Number(id)]
    );

    await pool.query("DELETE FROM compras.tbl_proveedores WHERE id_proveedor=$1", [Number(id)]);
    res.json({ message: "🗑️ Proveedor eliminado correctamente" });

    // 📋 Bitácora
    const userEmail = req.headers["x-user-email"] || req.headers["X-User-Email"];
    const id_usuario = userEmail ? await findUserId(userEmail) : null;
    const datos = prevData.rows[0] || {};
    await registrarBitacora({
      id_usuario,
      tabla: "compras.tbl_proveedores",
      accion: "DELETE",
      descripcion: `Proveedor "${datos.nombre || id}" eliminado por ${userEmail || "desconocido"}`,
      detalle: { id_proveedor: id, ...datos },
    });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(400).json({
        error: "No se puede eliminar este proveedor porque tiene órdenes asociadas.",
      });
    }
    console.error("❌ Error al eliminar proveedor:", error);
    res.status(500).json({ error: "Error al eliminar proveedor" });
  }
};
