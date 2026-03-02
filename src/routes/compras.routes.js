const express = require("express");
const router = express.Router();
const verifyPermission = require("../middleware/verifyObjectPermission");

const proveedoresCtrl = require("../controllers/compras/ProveedoresController");
const ordenCompraCtrl = require("../controllers/compras/OrdenDeCompraController");
const detalleOrdenCompraCtrl = require("../controllers/compras/DetalleOrdenCompraController");

// PROVEEDORES
router.get("/proveedores", proveedoresCtrl.getProveedores);
router.post("/proveedores", verifyPermission("Proveedores", "create"), proveedoresCtrl.insertProveedor);
router.put("/proveedores/:id_proveedor", verifyPermission("Proveedores", "update"), proveedoresCtrl.updateProveedor);
router.delete("/proveedores/:id", verifyPermission("Proveedores", "delete"), proveedoresCtrl.deleteProveedor);

// ÓRDENES
router.get("/orden-compra", ordenCompraCtrl.getOrdenesCompra);
router.get("/orden-compra/:id_orden_compra", ordenCompraCtrl.getOrdenCompraById);
router.post("/orden-compra", verifyPermission("Ordenes de compra", "create"), ordenCompraCtrl.insertOrdenCompra);
router.put("/orden-compra/:id_orden_compra", verifyPermission("Ordenes de compra", "update"), ordenCompraCtrl.updateOrdenCompra);
router.delete("/orden-compra/:id", verifyPermission("Ordenes de compra", "delete"), ordenCompraCtrl.deleteOrdenCompra);

// DETALLES
router.get("/detalle-orden-compra", detalleOrdenCompraCtrl.getDetallesOrdenCompra);
router.get("/detalle-orden-compra/:id_detalle_oc", detalleOrdenCompraCtrl.getDetalleOrdenCompraById);
router.get("/detalle-orden-compra/orden/:id_orden_compra", detalleOrdenCompraCtrl.getDetallesByOrden);
router.post("/detalle-orden-compra", verifyPermission("Ordenes de compra", "create"), detalleOrdenCompraCtrl.insertDetalleOrdenCompra);
router.put("/detalle-orden-compra/:id_detalle_oc", verifyPermission("Ordenes de compra", "update"), detalleOrdenCompraCtrl.updateDetalleOrdenCompra);
router.delete("/detalle-orden-compra/:id_detalle_oc", verifyPermission("Ordenes de compra", "delete"), detalleOrdenCompraCtrl.deleteDetalleOrdenCompra);


module.exports = router;
