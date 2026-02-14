// src/data/pedidos.js

export const productos = [
  { id_producto: 1, nombre: "Jugo de Naranja Concentrado (1 Galón)", precio_unitario: 50.0 },
  { id_producto: 2, nombre: "Jugo de Piña Concentrado (1 Galón)", precio_unitario: 60.0 },
  { id_producto: 3, nombre: "Jugo de Mango Concentrado (1 Galón)", precio_unitario: 55.0 },
  { id_producto: 4, nombre: "Jugo de Fresa Concentrado (1 Galón)", precio_unitario: 65.0 },
  { id_producto: 5, nombre: "Jugo de Uva Concentrado (1 Galón)", precio_unitario: 70.0 },
];

export const pedidos = [
  {
    id_pedido: 1,
    id_cliente: "1",
    fecha_reserva: "2025-08-01",
    fecha_entrega: "2025-08-05",
    id_estado_pedido: "Activo",
    id_metodo_pago: "Tarjeta de Crédito",
    observaciones: "Pedido urgente",
    productos: [
      { id_producto: 1, cantidad: 2, precio_unitario: 50.0, subtotal: 100.0 },
      { id_producto: 3, cantidad: 1, precio_unitario: 55.0, subtotal: 55.0 },
    ],
  },
  {
    id_pedido: 2,
    id_cliente: "2",
    fecha_reserva: "2025-08-02",
    fecha_entrega: "2025-08-06",
    id_estado_pedido: "Enviado",
    id_metodo_pago: "Efectivo",
    observaciones: "",
    productos: [
      { id_producto: 2, cantidad: 3, precio_unitario: 60.0, subtotal: 180.0 },
    ],
  },
  // …añade aquí el resto de tus pedidos
];
