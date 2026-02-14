// ============================================================
// 📄 src/controllers/contabilidad/pagos.controller.js
// ============================================================
const { pool } = require("../../db");

// ➕ Insertar pago
exports.insertarPago = async (req, res) => {
  try {
    const { id_credito, fecha_pago, monto_pagado, monto_pendiente, observaciones } = req.body;

    await pool.query(
      `CALL contabilidad.sp_pagos_insertar($1, $2, $3, $4, $5)`,
      [id_credito, fecha_pago, monto_pagado, monto_pendiente, observaciones]
    );

    res.json({ message: "✅ Pago insertado correctamente" });
  } catch (error) {
    console.error("❌ Error insertando pago:", error);
    res.status(500).json({ error: error.message });
  }
};

// 📋 Listar pagos
exports.listarPagos = async (_req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query("CALL contabilidad.sp_pagos_listar('cur_pagos')");
    const result = await pool.query("FETCH ALL FROM cur_pagos");
    await pool.query("COMMIT");
    res.json(result.rows);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error listando pagos:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✏️ Actualizar pago
exports.actualizarPago = async (req, res) => {
  try {
    const { id_pago } = req.params;
    const { id_credito, fecha_pago, monto_pagado, monto_pendiente, observaciones } = req.body;

    await pool.query(
      `CALL contabilidad.sp_pagos_actualizar($1, $2, $3, $4, $5, $6)`,
      [id_pago, id_credito, fecha_pago, monto_pagado, monto_pendiente, observaciones]
    );

    res.json({ message: "✅ Pago actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error actualizando pago:", error);
    res.status(500).json({ error: error.message });
  }
};

// ❌ Eliminar pago
exports.eliminarPago = async (req, res) => {
  try {
    const { id_pago } = req.params;
    await pool.query(`CALL contabilidad.sp_pagos_eliminar($1)`, [id_pago]);
    res.json({ message: "✅ Pago eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error eliminando pago:", error);
    res.status(500).json({ error: error.message });
  }
};
