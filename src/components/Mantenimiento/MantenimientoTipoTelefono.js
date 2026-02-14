import React, { useEffect, useState } from "react";
import { API_URL } from "../../config";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Spinner,
  useToast,
  useColorModeValue,
} from "@chakra-ui/react";
import CrudTabla from "../Seguridad/CrudTabla";

export default function MantenimientoTipoTelefono() {
  const accent = useColorModeValue("teal.600", "teal.300");
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarTiposTelefono = async () => {
    try {
      const res = await fetch(`${API_URL}/mantenimiento/tipo-telefono`);
      if (!res.ok) throw new Error("Error al obtener los tipos de teléfono");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("❌ Error cargando tipos de teléfono:", err);
      toast({
        title: "Error al cargar tipos de teléfono",
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTiposTelefono();
  }, []);

  const fields = [{ name: "nombre_tipo", label: "Nombre del Tipo", type: "text", required: true }];

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="50vh">
        <Spinner size="xl" color="teal.400" />
      </Flex>
    );
  }

  return (
    <>
      <Box p={3}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent}>
            Tipos de Teléfono
          </Heading>
        </Flex>
        <Divider mb={2} />
      </Box>

      <Box overflowX="auto">
        <CrudTabla
          title="Tipos de Teléfono"
          columns={["ID", "Nombre del Tipo"]}
          extractors={{
            ID: (r) => r.id_tipo_telefono,
            "Nombre del Tipo": (r) => r.nombre_tipo,
          }}
          fields={fields}
          idKey="id_tipo_telefono"
          initialData={data}
          onReload={cargarTiposTelefono}
          apiUrl={`${API_URL}/mantenimiento/tipo-telefono`}
        />
      </Box>
    </>
  );
}
