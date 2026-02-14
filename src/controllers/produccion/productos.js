// ============================================================
// 📁 src/controllers/Produccion/productos.js
// ============================================================
const { pool } = require("../../db");


// ✅ Obtener todos los productos (con JOIN al nombre del estado)
exports.getProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_producto,
        p.nombre,
        p.unidad_medida,
        p.precio_unitario,
        TO_CHAR(
          (p.fecha_creacion AT TIME ZONE 'America/Tegucigalpa'),
          'YYYY-MM-DD HH24:MI:SS'
        ) AS fecha_creacion,
        e.nombre_estado AS nombre_estado,
        p.id_estado_producto
      FROM ventasyreserva.tbl_productos AS p
      LEFT JOIN mantenimiento.tbl_estado_producto AS e
        ON p.id_estado_producto = e.id_estado_producto
      ORDER BY p.id_producto;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al listar productos:", err);
    res.status(500).json({ error: "Error al listar productos" });
  }
};


// ✅ Obtener un producto por ID
exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        p.id_producto,
        p.nombre,
        p.unidad_medida,
        p.precio_unitario,
        e.nombre_estado AS estado_producto,
        p.id_estado_producto
      FROM ventasyreserva.tbl_productos AS p
      JOIN mantenimiento.tbl_estado_producto AS e
        ON p.id_estado_producto = e.id_estado_producto
      WHERE p.id_producto = $1;
    `, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al obtener producto:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
};


// ✅ Insertar nuevo producto
exports.insertProducto = async (req, res) => {
  try {
    const { nombre, unidad_medida, precio_unitario, id_estado_producto } = req.body;
    const result = await pool.query(
      `INSERT INTO ventasyreserva.tbl_productos 
       (nombre, unidad_medida, precio_unitario, id_estado_producto)
       VALUES ($1, $2, $3, $4) RETURNING *;`,
      [nombre, unidad_medida, precio_unitario, id_estado_producto]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al insertar producto:", err);
    res.status(500).json({ error: "Error al insertar producto" });
  }
};

// ✅ Actualizar producto
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, unidad_medida, precio_unitario, id_estado_producto } = req.body;
    const result = await pool.query(
      `UPDATE ventasyreserva.tbl_productos
       SET nombre=$1, unidad_medida=$2, precio_unitario=$3, id_estado_producto=$4
       WHERE id_producto=$5 RETURNING *;`,
      [nombre, unidad_medida, precio_unitario, id_estado_producto, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al actualizar producto:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  }
};

// ✅ Eliminar producto
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM ventasyreserva.tbl_productos WHERE id_producto = $1;", [id]);
    res.json({ message: "Producto eliminado correctamente" });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
};