const express = require("express");
const router = express.Router();

const proveedoresCtrl = require("../controllers/compras/ProveedoresController");
const ordenCompraCtrl = require("../controllers/compras/OrdenDeCompraController");
const detalleOrdenCompraCtrl = require("../controllers/compras/DetalleOrdenCompraController");

// PROVEEDORES
router.get("/proveedores", proveedoresCtrl.getProveedores);
router.post("/proveedores", proveedoresCtrl.insertProveedor);
router.put("/proveedores/:id_proveedor", proveedoresCtrl.updateProveedor);
router.delete("/proveedores/:id", proveedoresCtrl.deleteProveedor);

// ÓRDENES
router.get("/orden-compra", ordenCompraCtrl.getOrdenesCompra);
router.get("/orden-compra/:id_orden_compra", ordenCompraCtrl.getOrdenCompraById);
router.post("/orden-compra", ordenCompraCtrl.insertOrdenCompra);
router.put("/orden-compra/:id_orden_compra", ordenCompraCtrl.updateOrdenCompra);
router.delete("/orden-compra/:id", ordenCompraCtrl.deleteOrdenCompra);

// DETALLES
// DETALLES
router.get("/detalle-orden-compra", detalleOrdenCompraCtrl.getDetallesOrdenCompra);
router.get("/detalle-orden-compra/:id_detalle_oc", detalleOrdenCompraCtrl.getDetalleOrdenCompraById);
router.get("/detalle-orden-compra/orden/:id_orden_compra", detalleOrdenCompraCtrl.getDetallesByOrden);
router.post("/detalle-orden-compra", detalleOrdenCompraCtrl.insertDetalleOrdenCompra);
router.put("/detalle-orden-compra/:id_detalle_oc", detalleOrdenCompraCtrl.updateDetalleOrdenCompra); // ← FALTABA
router.delete("/detalle-orden-compra/:id_detalle_oc", detalleOrdenCompraCtrl.deleteDetalleOrdenCompra);


module.exports = router;   // ← AQUÍ TERMINA
