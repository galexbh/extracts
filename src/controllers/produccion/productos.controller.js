// ============================================================
// 📁 src/controllers/produccion/productos.controller.js
// ============================================================

const { pool } = require("../../db");

const MAX_DESCRIPCION_PRODUCTO = 250;
const sanitizarDescripcion = (valor) => {
  if (!valor) return null;
  return String(valor).replace(/[\u0000-\u001F\u007F<>]/g, "").trim();
};

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
    let {
      nombre_producto,
      descripcion,
      unidad_medida,
      precio_unitario,
      id_estado_producto,
      stock_minimo,
      stock_maximo,
    } = req.body;

    // 🔒 Validaciones y Sanitización Backend
    nombre_producto = nombre_producto ? nombre_producto.trim() : null;
    descripcion = sanitizarDescripcion(descripcion);
    unidad_medida = unidad_medida ? unidad_medida.trim() : null;

    if (!nombre_producto || !unidad_medida) {
      return res.status(400).json({ error: "Nombre y unidad de medida son obligatorios." });
    }

    const unPermitidas = ["litro", "galón", "galon"];
    if (!unPermitidas.includes(unidad_medida.toLowerCase())) {
      return res.status(400).json({ error: "La unidad de medida solo puede ser 'Litro' o 'Galón'." });
    }

    // Normalizar capitalización
    if (unidad_medida.toLowerCase() === "litro") unidad_medida = "Litro";
    else unidad_medida = "Galón";

    if (Number(precio_unitario) <= 0) {
      return res.status(400).json({ error: "El precio unitario debe ser mayor a 0." });
    }

    if (Number(stock_minimo) < 0 || Number(stock_maximo) < 0) {
      return res.status(400).json({ error: "El stock no puede ser negativo." });
    }

    if (Number(stock_maximo) < Number(stock_minimo)) {
      return res.status(400).json({ error: "El stock máximo no puede ser menor al mínimo." });
    }

    if (descripcion && descripcion.length > MAX_DESCRIPCION_PRODUCTO) {
      return res.status(400).json({
        error: `La descripcion no puede exceder los ${MAX_DESCRIPCION_PRODUCTO} caracteres.`,
      });
    }

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
    let {
      nombre_producto,
      descripcion,
      unidad_medida,
      precio_unitario,
      id_estado_producto,
      stock_minimo,
      stock_maximo,
    } = req.body;

    // 🔒 Validaciones y Sanitización Backend
    nombre_producto = nombre_producto ? nombre_producto.trim() : null;
    descripcion = sanitizarDescripcion(descripcion);
    unidad_medida = unidad_medida ? unidad_medida.trim() : null;

    if (!nombre_producto || !unidad_medida) {
      return res.status(400).json({ error: "Nombre y unidad de medida son obligatorios." });
    }

    const unPermitidas = ["litro", "galón", "galon"];
    if (!unPermitidas.includes(unidad_medida.toLowerCase())) {
      return res.status(400).json({ error: "La unidad de medida solo puede ser 'Litro' o 'Galón'." });
    }

    // Normalizar capitalización
    if (unidad_medida.toLowerCase() === "litro") unidad_medida = "Litro";
    else unidad_medida = "Galón";

    if (Number(precio_unitario) <= 0) {
      return res.status(400).json({ error: "El precio unitario debe ser mayor a 0." });
    }

    if (Number(stock_minimo) < 0 || Number(stock_maximo) < 0) {
      return res.status(400).json({ error: "El stock no puede ser negativo." });
    }

    if (Number(stock_maximo) < Number(stock_minimo)) {
      return res.status(400).json({ error: "El stock máximo no puede ser menor al mínimo." });
    }

    if (descripcion && descripcion.length > MAX_DESCRIPCION_PRODUCTO) {
      return res.status(400).json({
        error: `La descripcion no puede exceder los ${MAX_DESCRIPCION_PRODUCTO} caracteres.`,
      });
    }

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
// Bug fix: ahora usa transacción para eliminar también el registro
// de inventario asociado y evitar registros huérfanos.
// ============================================================
exports.deleteProducto = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Eliminar el inventario vinculado al producto primero
    await client.query(
      `DELETE FROM inventario.tbl_inventario_productos WHERE id_producto = $1`,
      [req.params.id]
    );

    // Luego eliminar el producto
    const result = await client.query(
      `DELETE FROM produccion.tbl_productos WHERE id_producto = $1 RETURNING id_producto`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await client.query("COMMIT");
    res.json({ message: "Producto eliminado" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error al eliminar producto:", err);
    res.status(500).json({ error: "Error al eliminar producto" });
  } finally {
    client.release();
  }
};
