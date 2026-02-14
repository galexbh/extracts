// ============================================================
// 📦 Inventario de Productos Controller
// ============================================================
const { pool } = require("../../db");

// ============================================================
// 🔹 LISTAR INVENTARIO DE PRODUCTOS
// ============================================================
exports.getInventarioProductos = async (req, res) => {
  try {
    const query = `
      SELECT 
        ip.id_inventario_producto,
        ip.id_producto,
        p.nombre_producto AS nombre_producto,
        p.precio_unitario,                 -- 👈 NUEVO
        ip.stock_actual,
        ip.stock_minimo,
        ip.stock_maximo,
        ip.unidad_medida,
        ip.nivel,
        ip.entradas,
        ip.salidas,
        ip.fecha_actualizacion,
        ip.empleado_asignado,
        eip.nombre_estado AS estado_inventario
      FROM inventario.tbl_inventario_producto ip
      INNER JOIN produccion.tbl_productos p 
              ON p.id_producto = ip.id_producto
      INNER JOIN mantenimiento.tbl_estado_inventario_producto eip
              ON eip.id_estado_inventario_producto = ip.id_estado_inventario_producto
      ORDER BY ip.id_inventario_producto ASC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (error) {
    console.error("❌ Error al listar inventario de productos:", error);
    res.status(500).json({ error: "Error al listar inventario de productos" });
  }
};

// ============================================================
// 🔹 2. INSERTAR INVENTARIO AUTOMÁTICAMENTE
// ============================================================
exports.insertInventarioProducto = async (req, res) => {
  try {
    const { id_producto } = req.body;

    await pool.query(
      `CALL inventario.sp_insert_inventario_producto($1);`,
      [id_producto]
    );

    res.json({
      message: "Inventario de producto creado correctamente."
    });

  } catch (error) {
    console.error("❌ Error al insertar inventario de producto:", error);
    res.status(500).json({ error: "Error al insertar inventario" });
  }
};

// ============================================================
// 🔹 3. ACTUALIZAR INVENTARIO
// ============================================================
exports.updateInventarioProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      stock_minimo,
      stock_maximo,
      unidad_medida,
      empleado_asignado
    } = req.body;

    await pool.query(
      `CALL inventario.sp_update_inventario_producto($1, $2, $3, $4, $5);`,
      [
        id,
        stock_minimo,
        stock_maximo,
        unidad_medida,
        empleado_asignado
      ]
    );

    res.json({
      message: "Inventario de producto actualizado correctamente."
    });

  } catch (error) {
    console.error("❌ Error al actualizar inventario de producto:", error);
    res.status(500).json({ error: "Error al actualizar inventario" });
  }
};

// ============================================================
// 🔹 4. ELIMINAR INVENTARIO
// ============================================================
exports.deleteInventarioProducto = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `CALL inventario.sp_delete_inventario_producto($1);`,
      [id]
    );

    res.json({ message: "Inventario de producto eliminado correctamente." });

  } catch (error) {
    console.error("❌ Error al eliminar inventario de producto:", error);
    res.status(500).json({ error: "Error al eliminar inventario" });
  }
};

// ============================================================
// 🔹 5. REGISTRAR MOVIMIENTO (Entrada / Salida)
// ============================================================
exports.registrarMovimientoProducto = async (req, res) => {
  try {
    const { id_producto, tipo, cantidad } = req.body;

    const usuario = req.headers["x-user-email"] || "sistema";

    await pool.query(
      `CALL inventario.sp_registrar_movimiento_producto($1, $2, $3, $4);`,
      [id_producto, tipo, cantidad, usuario]
    );

    res.json({
      message: "Movimiento de producto registrado correctamente."
    });

  } catch (error) {
    console.error("❌ Error al registrar movimiento de producto:", error);
    res.status(500).json({ error: "Error al registrar movimiento" });
  }
};
