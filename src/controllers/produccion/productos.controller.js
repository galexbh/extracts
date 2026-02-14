// ============================================================
// 📁 src/controllers/produccion/productos.controller.js
// ============================================================

const { pool } = require("../../db");

// ============================================================
// 🔹 GET: Obtener todos los productos
// ============================================================
exports.getProductos = async (_req, res) => {
  try {
    const q = `
      SELECT 
        p.id_producto,
        p.nombre_producto,
        p.descripcion,
        p.unidad_medida,
        p.precio_unitario,
        p.stock_minimo,
        p.stock_maximo,
        p.fecha_creacion,
        e.nombre_estado AS estado_producto
      FROM produccion.tbl_productos p
      LEFT JOIN mantenimiento.tbl_estado_producto e
            ON e.id_estado_producto = p.id_estado_producto
      ORDER BY p.id_producto;
    `;
    const result = await pool.query(q);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error al listar productos:", err);
    res.status(500).json({ error: "Error al listar productos" });
  }
};

// ============================================================
// 🔹 GET: Producto por ID
// ============================================================
exports.getProductoById = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        p.*,
        e.nombre_estado AS estado_producto
      FROM produccion.tbl_productos p
      LEFT JOIN mantenimiento.tbl_estado_producto e
            ON e.id_estado_producto = p.id_estado_producto
      WHERE p.id_producto = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error al obtener producto:", err);
    res.status(500).json({ error: "Error al obtener producto" });
  }
};

// ============================================================
// 🔹 POST: Insertar producto (🔥 sincroniza INVENTARIO)
// ============================================================
exports.insertProducto = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      nombre_producto,
      descripcion,
      unidad_medida,
      precio_unitario,
      id_estado_producto,
      stock_minimo,
      stock_maximo,
    } = req.body;

    await client.query("BEGIN");

    // Insertar el producto
    const insert = await client.query(
      `
      INSERT INTO produccion.tbl_productos(
        nombre_producto, descripcion, unidad_medida,
        precio_unitario, id_estado_producto,
        fecha_creacion, stock_minimo, stock_maximo
      )
      VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7)
      RETURNING id_producto
      `,
      [
        nombre_producto,
        descripcion,
        unidad_medida,
        precio_unitario,
        id_estado_producto,
        stock_minimo,
        stock_maximo,
      ]
    );

    const id_producto = insert.rows[0].id_producto;

    // Crear inventario sincronizado automáticamente
    await client.query(
      `CALL inventario.sp_insert_inventario_producto($1);`,
      [id_producto]
    );

    await client.query("COMMIT");

    res.json({ message: "Producto agregado correctamente" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al insertar producto:", err);
    res.status(500).json({ error: "Error al insertar producto" });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 PUT: Actualizar producto (🔥 sincroniza INVENTARIO)
// ============================================================
exports.updateProducto = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      nombre_producto,
      descripcion,
      unidad_medida,
      precio_unitario,
      id_estado_producto,
      stock_minimo,
      stock_maximo,
    } = req.body;

    await client.query("BEGIN");

    // Actualizar producto
    await client.query(
      `
      UPDATE produccion.tbl_productos
      SET nombre_producto=$1,
          descripcion=$2,
          unidad_medida=$3,
          precio_unitario=$4,
          id_estado_producto=$5,
          stock_minimo=$6,
          stock_maximo=$7
      WHERE id_producto=$8
      `,
      [
        nombre_producto,
        descripcion,
        unidad_medida,
        precio_unitario,
        id_estado_producto,
        stock_minimo,
        stock_maximo,
        req.params.id,
      ]
    );

    // 🔥 Sincronizar inventario (min/max/unidad)
    await client.query(
      `CALL inventario.sp_update_inventario_producto($1);`,
      [req.params.id]
    );

    await client.query("COMMIT");

    res.json({ message: "Producto actualizado" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al actualizar producto:", err);
    res.status(500).json({ error: "Error al actualizar producto" });
  } finally {
    client.release();
  }
};

// ============================================================
// 🔹 DELETE: Eliminar producto
// ============================================================
exports.deleteProducto = async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM produccion.tbl_productos WHERE id_producto=$1`,
      [req.params.id]
    );

    res.json({ message: "Producto eliminado" });
  } catch (err) {
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  }
};
