// src/components/Seguridad/HistContrasenas.jsx
import React from "react";
import { Box, Heading, Divider, useColorModeValue } from "@chakra-ui/react";
import CrudTabla from "./CrudTabla";

/*
  - Contraseña siempre MASCARADA con puntos (sin mencionar "hash")
  - Extractors devuelven STRINGS (compatibles con PDF/Excel)
  - "Usuario / Creado / Modificado" como "ID - Nombre"
  - Fechas "YYYY-MM-DD HH:mm"
  - Encabezado visible con el nombre de la tabla
*/

const columns = [
  "ID Hist",
  "Usuario",
  "Contraseña",
  "Usuario Creado",
  "Fecha Creado",
  "Usuario Modificado",
  "Fecha Modificado",
];

// Mapa de usuarios (ajusta con tus IDs reales)
const usuariosMap = {
  1: "Juan Madrid",
  2: "Eduardo Gavarrete",
  3: "Clarissa Díaz",
};

// Helpers
const nb = "\u00A0"; // no-break space
const idNombre = (id, nombre) => `${id}${nb}-${nb}${nombre || "Desconocido"}`;
const formatDateTime = (iso) => (iso ? iso.replace("T", " ").slice(0, 16) : "");
const maskPassword = (val) => (val ? "••••••••••••" : "");

// Extractors (todo como string)
const extractors = {
  "ID Hist":            (r) => String(r.id_hist ?? ""),
  "Usuario":            (r) => idNombre(r.id_usuario, usuariosMap[r.id_usuario]),
  "Contraseña":         (r) => maskPassword(r.contrasena),
  "Usuario Creado":     (r) => idNombre(r.id_usuario_creado, usuariosMap[r.id_usuario_creado]),
  "Fecha Creado":       (r) => formatDateTime(r.fecha_creado),
  "Usuario Modificado": (r) =>
    r.id_usuario_modificado != null
      ? idNombre(r.id_usuario_modificado, usuariosMap[r.id_usuario_modificado])
      : "",
  "Fecha Modificado":   (r) => formatDateTime(r.fecha_modificado),
};

// Campos del formulario (auditoría en solo lectura; usualmente lo llena backend)
const fields = [
  { name: "id_usuario",            label: "ID Usuario",         type: "number"    },
  { name: "contrasena",            label: "Contraseña",         type: "text"      }, // valor almacenado (idealmente ya hasheado en backend)
  { name: "id_usuario_creado",     label: "Usuario Creado",     type: "number",   readOnly: true },
  { name: "fecha_creado",          label: "Fecha Creado",       type: "datetime", readOnly: true },
  { name: "id_usuario_modificado", label: "Usuario Modificado", type: "number",   readOnly: true },
  { name: "fecha_modificado",      label: "Fecha Modificado",   type: "datetime", readOnly: true },
];

// Datos de ejemplo (valores ficticios)
const initialData = [
  // Usuario 1 (Juan) - alta y rotación
  {
    id_hist: 1,
    id_usuario: 1,
    contrasena: "$2b$10$Q1w2E3r4T5y6U7i8O9p0a.ABCDEFGHIJKLMNOPQRSTUVWX12",
    id_usuario_creado: 1,
    fecha_creado: "2025-07-25T08:00",
    id_usuario_modificado: 1,
    fecha_modificado: "2025-07-25T08:00",
  },
  {
    id_hist: 2,
    id_usuario: 1,
    contrasena: "$2b$10$Z9x8C7v6B5n4M3k2J1h0g.FEDCBAZYXWVUTSRQPONMLKJ98",
    id_usuario_creado: 1,
    fecha_creado: "2025-08-01T07:00",
    id_usuario_modificado: 1,
    fecha_modificado: "2025-08-01T07:00",
  },

  // Usuario 2 (Eduardo)
  {
    id_hist: 3,
    id_usuario: 2,
    contrasena: "$2b$10$hG7fD6sA5qW4eR3tY2uI1o.PqrsTUVwxyzABCDE12345678",
    id_usuario_creado: 2,
    fecha_creado: "2025-07-30T09:30",
    id_usuario_modificado: 2,
    fecha_modificado: "2025-07-30T09:30",
  },
  {
    id_hist: 4,
    id_usuario: 2,
    contrasena: "$2b$10$LmNoPqRsTuVwXyZaBcDeFg.HIJKLMNOpqrstUVWX987654",
    id_usuario_creado: 2,
    fecha_creado: "2025-08-02T08:15",
    id_usuario_modificado: 2,
    fecha_modificado: "2025-08-02T08:15",
  },

  // Usuario 3 (Clarissa)
  {
    id_hist: 5,
    id_usuario: 3,
    contrasena: "$2b$10$Aa1Bb2Cc3Dd4Ee5Ff6Gg7H.ijklMNOPQRSTuvWXyz01234",
    id_usuario_creado: 3,
    fecha_creado: "2025-07-29T10:20",
    id_usuario_modificado: 3,
    fecha_modificado: "2025-07-29T10:20",
  },
  {
    id_hist: 6,
    id_usuario: 3,
    contrasena: "$2b$10$Zz9Yy8Xx7Ww6Vv5Uu4Tt3S.RQPONMLKJIHGFEDCBA98765",
    id_usuario_creado: 3,
    fecha_creado: "2025-08-03T07:45",
    id_usuario_modificado: 3,
    fecha_modificado: "2025-08-03T07:45",
  },
];

// Orden: más reciente primero por fecha_creado
const initialDataSorted = [...initialData].sort(
  (a, b) => new Date(b.fecha_creado) - new Date(a.fecha_creado)
);

export default function HistContrasenas() {
  const accent = useColorModeValue("teal.600", "teal.300");

  return (
    <Box p={2}>
      {/* Encabezado visible con el nombre de la tabla */}
      <Heading size="md" color={accent} mb={2}>
        Historial de contraseñas
      </Heading>
      <Divider mb={2} />

      <CrudTabla
        title="Historial de contraseñas" // también se usa para el nombre del archivo al exportar
        columns={columns}
        extractors={extractors}
        fields={fields}
        idKey="id_hist"
        initialData={initialDataSorted}
      />
    </Box>
  );
}
