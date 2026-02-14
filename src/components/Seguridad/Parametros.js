// src/components/Seguridad/Parametros.jsx
import React from "react";
import { Box, Flex, Heading, Divider, useColorModeValue } from "@chakra-ui/react";
import CrudTabla from "./CrudTabla";

const columns = [
  "ID Parámetro",
  "Parámetro",
  "Valor",
  "Usuario Creado",
  "Fecha Creado",
  "Usuario Modificado",
  "Fecha Modificado",
];

const usuariosMap = { 1: "Juan Madrid", 2: "Eduardo Gavarrete", 3: "Clarissa Díaz" };
const nb = "\u00A0";
const idNombre = (id, nombre) => `${id}${nb}-${nb}${nombre || "Desconocido"}`;

const formatDateTime = (iso) => (iso ? iso.replace("T", " ").slice(0, 16) : "");
const formatDateTimeNoWrap = (iso) => {
  const s = formatDateTime(iso);
  return s ? s.replace(" ", "\u00A0") : "";
};

const extractors = {
  "ID Parámetro": (r) => r.id_parametro,
  "Parámetro": (r) => r.parametro,
  "Valor": (r) => r.valor,
  "Usuario Creado": (r) => idNombre(r.id_usuario_creado, usuariosMap[r.id_usuario_creado]),
  "Fecha Creado": (r) => formatDateTimeNoWrap(r.fecha_creado),
  "Usuario Modificado": (r) => idNombre(r.id_usuario_modificado, usuariosMap[r.id_usuario_modificado]),
  "Fecha Modificado": (r) => formatDateTimeNoWrap(r.fecha_modificado),
};

const fields = [
  { name: "parametro", label: "Parámetro", type: "text" },
  { name: "valor", label: "Valor", type: "text" },
  { name: "id_usuario_creado", label: "Usuario Creado", type: "number" },
  { name: "fecha_creado", label: "Fecha Creado", type: "datetime" },
  { name: "id_usuario_modificado", label: "Usuario Modificado", type: "number" },
  { name: "fecha_modificado", label: "Fecha Modificado", type: "datetime" },
];

const initialData = [
  { id_parametro: 1, parametro: "PASSWORD_MIN_LEN", valor: "8",
    id_usuario_creado: 1, fecha_creado: "2025-07-30T08:00",
    id_usuario_modificado: 1, fecha_modificado: "2025-08-01T08:30" },
  { id_parametro: 2, parametro: "PASSWORD_REQUIRE_UPPER", valor: "1",
    id_usuario_creado: 1, fecha_creado: "2025-07-30T08:05",
    id_usuario_modificado: 2, fecha_modificado: "2025-08-01T09:10" },
  { id_parametro: 3, parametro: "COMPANY_NAME", valor: "Extractus",
    id_usuario_creado: 1, fecha_creado: "2025-07-29T09:00",
    id_usuario_modificado: 3, fecha_modificado: "2025-08-02T09:50" },
];

export default function Parametros() {
  const accent = useColorModeValue("teal.600", "teal.300");
  return (
    <>
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>Parámetros</Heading>
        </Flex>
        <Divider mb={2} />
      </Box>
      <CrudTabla
        title="Parámetros"
        columns={columns}
        extractors={extractors}
        fields={fields}
        idKey="id_parametro"
        initialData={initialData}
      />
    </>
  );
}
