// ============================================================
// 📁 src/controllers/Ventas/ClientesController.js
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR TODOS LOS CLIENTES
// ============================================================
exports.getClientes = async (req, res) => {
  try {
    await pool.query("BEGIN");
    await pool.query(`CALL ventasyreserva.sp_listar_clientes('cur_clientes')`);
    const result = await pool.query(`FETCH ALL FROM cur_clientes`);
    await pool.query("COMMIT");
    res.json(result.rows); // 👈 Aquí se devuelven los resultados al frontend
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al listar clientes:", error);
    res.status(500).json({ error: error.message });
  }
};
// ============================================================
// 🔹 OBTENER CLIENTE POR ID (usando procedimiento almacenado)
// ============================================================
exports.getClienteById = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("BEGIN");
    await pool.query(
      `CALL ventasyreserva.sp_buscar_clientes_por_id($1, 'cur_cliente')`,
      [id]
    );
    const result = await pool.query(`FETCH ALL FROM cur_cliente`);
    await pool.query("COMMIT");

    if (result.rows.length === 0)
      return res.status(404).json({ message: "Cliente no encontrado" });

    res.json(result.rows[0]);
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al obtener cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 INSERTAR CLIENTE
// ============================================================
exports.insertCliente = async (req, res) => {
  try {
    const {
      nombre_cliente,
      rtn,
      id_tipo_cliente,
      direccion,
      telefono,
      correo_electronico,
      id_estado_cliente,
    } = req.body;

    await pool.query(
      `CALL ventasyreserva.sp_insertar_clientes($1, $2, $3, $4, $5, $6, $7)`,
      [
        nombre_cliente,
        rtn,
        id_tipo_cliente,
        direccion,
        telefono,
        correo_electronico,
        id_estado_cliente,
      ]
    );

    res.json({ message: "✅ Cliente insertado correctamente" });
  } catch (error) {
    console.error("❌ Error al insertar cliente:", error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 🔹 ACTUALIZAR CLIENTE
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

  try {
    await pool.query(
      `CALL ventasyreserva.sp_actualizar_clientes($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id_cliente,
        nombre_cliente,
        rtn,
        id_tipo_cliente,
        direccion,
        telefono,
        correo_electronico,
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
  const { id } = req.params;
  try {
    await pool.query(`CALL ventasyreserva.sp_eliminar_clientes($1)`, [id]);
    res.json({ message: "🗑️ Cliente eliminado correctamente" });
  } catch (error) {
    console.error("❌ Error al eliminar cliente:", error);
    res.status(500).json({ error: error.message });
  }
};
