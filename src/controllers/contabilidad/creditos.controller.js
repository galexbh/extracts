// ============================================================
// 📄 src/controllers/contabilidad/creditos.controller.js
// ============================================================
const { pool } = require("../../db");

// ➕ Insertar crédito
exports.insertarCredito = async (req, res) => {
  try {
    const { id_cliente, id_detalle_pedidos, monto_credito, fecha_inicio, fecha_vencimiento, id_estado_credito } = req.body;

    // basic validation
    if (!id_cliente || !monto_credito || !fecha_inicio) {
      return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    await pool.query(
      `CALL contabilidad.sp_creditos_insertar($1, $2, $3, $4, $5, $6)`,
      [id_cliente, id_detalle_pedidos, monto_credito, fecha_inicio, fecha_vencimiento, id_estado_credito]
    );

    res.json({ message: "✅ Crédito insertado correctamente" });
  } catch (error) {
    console.error("❌ Error insertando crédito:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📋 Listar créditos
exports.listarCreditos = async (_req, res) => {
  try {
    await pool.query(`BEGIN`);
    await pool.query(`CALL contabilidad.sp_creditos_listar('cur_creditos')`);
    const result = await pool.query(`FETCH ALL FROM cur_creditos`);
    await pool.query(`COMMIT`);
    res.json(result.rows);
  } catch (error) {
    await pool.query(`ROLLBACK`);
    res.status(500).json({ error: error.message });
  }
};

// ✏️ Actualizar crédito
exports.actualizarCredito = async (req, res) => {
  try {
    // use the route parameter as the source of truth
    const { id_credito } = req.params;
    const { id_cliente, id_detalle_pedidos, monto_credito, fecha_inicio, fecha_vencimiento, id_estado_credito } = req.body;

    if (!id_credito) {
      return res.status(400).json({ error: "Falta id_credito en la URL" });
    }

    await pool.query(
      `CALL contabilidad.sp_creditos_actualizar($1, $2, $3, $4, $5, $6, $7)`,
      [id_credito, id_cliente, id_detalle_pedidos, monto_credito, fecha_inicio, fecha_vencimiento, id_estado_credito]
    );

    res.json({ message: "✅ Crédito actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error actualizando crédito:", error);
    res.status(500).json({ error: error.message });
  }
};

// ❌ Eliminar crédito
exports.eliminarCredito = async (req, res) => {
  try {
    const { id_credito } = req.params;
    await pool.query(`CALL contabilidad.sp_creditos_eliminar($1)`, [id_credito]);
    res.json({ message: "✅ Crédito eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
