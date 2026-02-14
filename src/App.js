// ============================================================
// 📁 src/App.js — VERSIÓN FINAL UNIFICADA Y OPTIMIZADA
// ============================================================
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from "./context/AuthContext";

// 🔓 Públicas
import Login from './components/login/login';
import ResetPasswordPage from "./components/auth/ResetPasswordPage";

// 🔒 Privadas
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Inicio from './components/Inicio/Inicio';

// ===============================
// 🔐 SEGURIDAD
// ===============================
import MenuSeguridad from './components/Seguridad/menuseguridad';
import UsuariosSeg from './components/Seguridad/Usuarios';
import RolesSeg from './components/Seguridad/Roles';
import Bitacora from './components/Seguridad/Bitacora';
import Personas from './components/Seguridad/personas';
import Objetos from './components/Seguridad/Objetos';
import Permisos from './components/Seguridad/Permisos';
import CambiarContrasena from './components/Seguridad/cambiarcontrasena';
import MenuDatosGenerales from './components/Seguridad/MenuDatosGenerales';

// ===============================
// 🛒 VENTAS Y RESERVAS
// ===============================
import MenuVentas from './components/Ventas/Menuventas';
import Clientes from './components/Ventas/Clientes';
import Pedidos from './components/Ventas/Pedidos';
import Factura from './components/Ventas/Factura';
import PagosFactura from "./components/Ventas/PagosFactura";

// ===============================
// 📊 CONTABILIDAD
// ===============================
import MenuContabilidad from './components/Contabilidad/menucontabilidad';
import Creditos from './components/Contabilidad/Creditos';
import Mora from './components/Contabilidad/Mora';
import Pagos from './components/Contabilidad/Pagos';
import ReportesContabilidad from "./components/Contabilidad/ReportesContabilidad";

// ===============================
// 🏭 PRODUCCIÓN
// ===============================
import Menuproduccion from './components/produccion/menuproduccion';
import Productos from './components/produccion/productos';
import Recetas from './components/produccion/Recetas';
import Produccion from './components/produccion/produccion';
import Insumos from './components/produccion/Insumos';

// ===============================
// 🛍️ COMPRAS
// ===============================
import Compras from './components/Compras/Compras';
import Proveedores from './components/Compras/Proveedores';
import OrdenCompra from './components/Compras/OrdenCompra';
import DetalleCompra from './components/Compras/DetalleCompra';
import ReporteCompras from "./components/Compras/ReporteCompras";

// ===============================
// 🚚 ENTREGAS
// ===============================
import Entregas from './components/Entregas/Entregas';
import GestionEntregas from './components/Entregas/GestionEntregas';
import DetalleEntregas from './components/Entregas/DetalleEntregas';

// ===============================
// 📦 INVENTARIOS
// ===============================
import MenuInventarios from './components/Inventarios/MenuInventarios';
import InsumosInventario from './components/Inventarios/Insumos';
import ProductosInv from './components/Inventarios/InventarioProductosDashboard';
import Movimientos from './components/Inventarios/Movimientos';
import MovimientosInsumos from './components/Inventarios/MovimientosInsumos';
import MovimientosProductos from './components/Inventarios/MovimientosProductos';

// ===============================
// 🔧 MANTENIMIENTO
// ===============================
import Menumantenimiento from './components/Mantenimiento/Menumantenimiento';
import MantenimientoClientes from './components/Mantenimiento/MantenimientoClientes';
import MantenimientoProveedores from './components/Mantenimiento/MantenimientoProveedores';
import MantenimientoProductos from './components/Mantenimiento/MantenimientoProductos';
import MantenimientoPedidos from './components/Mantenimiento/MantenimientoPedidos';
import MantenimientoFactura from './components/Mantenimiento/MantenimientoFactura';
import MantenimientoInventario from './components/Mantenimiento/MantenimientoInventario';

// Tipos y estados
import MantenimientoTipoPersona from './components/Mantenimiento/MantenimientoTipoPersona';
import MantenimientoTipoTelefono from './components/Mantenimiento/MantenimientoTipoTelefono';
import MantenimientoEstadoUsuario from './components/Mantenimiento/MantenimientoEstadoUsuario';
import TipoCliente from './components/Mantenimiento/TipoCliente';
import EstadoCliente from './components/Mantenimiento/EstadoCliente';
import EstadoProveedor from './components/Mantenimiento/MantenimientoEstadoProveedor';
import MantenimientoEstadoOrdenCompra from './components/Mantenimiento/MantenimientoEstadoOrdenCompra';
import MantenimientoEstadoProducto from './components/Mantenimiento/MantenimientoEstadoProducto';
import EstadoInsumo from "./components/Mantenimiento/EstadoInsumo";
import EstadoInventarioInsumo from "./components/Mantenimiento/EstadoInventarioInsumo";
import MantenimientoEstadoInventarioProducto from './components/Mantenimiento/MantenimientoEstadoInventarioProducto';


// ============================================================
//                        APP PRINCIPAL
// ============================================================
function App() {
  return (
    <ChakraProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            {/* 🟢 RUTAS PÚBLICAS */}
            <Route path="/" element={<Login />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* 🔐 RUTAS PRIVADAS */}
            <Route
              path="/app/*"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >

              {/* Dashboard */}
              <Route index element={<Inicio />} />

              {/* ===================== SEGURIDAD ===================== */}
              <Route path="seguridad" element={<MenuSeguridad />} />
              <Route path="seguridad/usuarios" element={<UsuariosSeg />} />
              <Route path="seguridad/personas" element={<Personas />} />
              <Route path="seguridad/roles" element={<RolesSeg />} />
              <Route path="seguridad/bitacora" element={<Bitacora />} />
              <Route path="seguridad/objetos" element={<Objetos />} />
              <Route path="seguridad/permisos" element={<Permisos />} />
              <Route path="seguridad/cambiarcontrasena" element={<CambiarContrasena />} />
              <Route path="seguridad/datosgenerales" element={<MenuDatosGenerales />} />

              {/* ===================== VENTAS ===================== */}
              <Route path="ventas" element={<MenuVentas />} />
              <Route path="ventas/clientes" element={<Clientes />} />
              <Route path="ventas/pedidos" element={<Pedidos />} />
              <Route path="ventas/factura" element={<Factura />} />

              {/* ===================== CONTABILIDAD ===================== */}
              <Route path="contabilidad" element={<MenuContabilidad />} />
              <Route path="contabilidad/creditos" element={<Creditos />} />
              <Route path="contabilidad/mora" element={<Mora />} />
              <Route path="contabilidad/pagos" element={<Pagos />} />
             
<Route path="ventas/pagos-factura" element={<PagosFactura />} />
<Route path="contabilidad/reportes-contabilidad" element={<ReportesContabilidad />} />



              {/* ===================== PRODUCCIÓN ===================== */}
              <Route path="produccion" element={<Menuproduccion />} />
              <Route path="produccion/productos" element={<Productos />} />
              <Route path="produccion/recetas" element={<Recetas />} />
              <Route path="produccion/produccion" element={<Produccion />} />
              <Route path="produccion/insumos" element={<Insumos />} />

              {/* ===================== COMPRAS ===================== */}
              <Route path="compras" element={<Compras />} />
              <Route path="compras/proveedores" element={<Proveedores />} />
              <Route path="compras/orden" element={<OrdenCompra />} />
              <Route path="compras/detalle" element={<DetalleCompra />} />
              <Route path="compras/reporte" element={<ReporteCompras />} />

              {/* ===================== ENTREGAS ===================== */}
              <Route path="entregas" element={<Entregas />} />
              <Route path="entregas/gestion" element={<GestionEntregas />} />
              <Route path="entregas/detalle" element={<DetalleEntregas />} />

              {/* ===================== INVENTARIOS ===================== */}
              <Route path="inventarios" element={<MenuInventarios />} />
              <Route path="inventarios/insumos" element={<InsumosInventario />} />
              <Route path="inventarios/productos" element={<ProductosInv />} />
              <Route path="inventarios/movimientos" element={<Movimientos />} />
              <Route path="inventarios/movimientos-insumos" element={<MovimientosInsumos />} />
              <Route path="inventarios/movimientos-productos" element={<MovimientosProductos />} />

              {/* ===================== MANTENIMIENTO ===================== */}
              <Route path="mantenimiento" element={<Menumantenimiento />} />
              <Route path="mantenimiento/clientes" element={<MantenimientoClientes />} />
              <Route path="mantenimiento/proveedores" element={<MantenimientoProveedores />} />
              <Route path="mantenimiento/productos" element={<MantenimientoProductos />} />
              <Route path="mantenimiento/pedidos" element={<MantenimientoPedidos />} />
              <Route path="mantenimiento/facturas" element={<MantenimientoFactura />} />
              <Route path="mantenimiento/inventarios" element={<MantenimientoInventario />} />

              {/* Tipos y Estados */}
              <Route path="mantenimiento/tipo-persona" element={<MantenimientoTipoPersona />} />
              <Route path="mantenimiento/tipo-telefono" element={<MantenimientoTipoTelefono />} />
              <Route path="mantenimiento/estado-usuario" element={<MantenimientoEstadoUsuario />} />
              <Route path="mantenimiento/tipo-cliente" element={<TipoCliente />} />
              <Route path="mantenimiento/estado-cliente" element={<EstadoCliente />} />
              <Route path="mantenimiento/estado-proveedor" element={<EstadoProveedor />} />
              <Route path="mantenimiento/estado-orden-compra" element={<MantenimientoEstadoOrdenCompra />} />
              <Route path="mantenimiento/estado-producto" element={<MantenimientoEstadoProducto />} />
              <Route path="mantenimiento/estado-insumo" element={<EstadoInsumo />} />
              <Route path="mantenimiento/estado-inventario-insumo" element={<EstadoInventarioInsumo />} />
              <Route path="mantenimiento/estado-inventario-producto" element={<MantenimientoEstadoInventarioProducto />} />

            </Route>

            {/* ❗ CATCH-ALL */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ChakraProvider>
  );
}

export default App;
