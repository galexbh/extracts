// ============================================================
// 📁 src/components/Contabilidad/Pagos.js
// ============================================================

import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Flex, Table, Thead, Tbody, Tr, Th, Td, Button, IconButton, Checkbox,
  Menu, MenuButton, MenuList, MenuItem, useDisclosure, Modal, ModalOverlay,
  ModalContent, ModalHeader, ModalBody, ModalFooter, FormControl, Input, Select,
  useColorModeValue, useToast, Heading, Divider, HStack
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { FaSyncAlt } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png";
import api from "../../api/apiClient"; // ✅ Cliente centralizado con UID

/* ======================================
   🔹 CONFIGURACIÓN GENERAL
   ====================================== */
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Pagos";

const allColumns = [
  "ID Pago",
  "Cliente",
  "Total Crédito",
  "Monto Pagado",
  "Fecha de Pago",
  "Observaciones",
  "Estado",
];

const formatoLempira = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const columnExtractors = {
  "ID Pago": (p) => p.id_pago,
  Cliente: (p) => p.cliente || "N/A",
  "Total Crédito": (p) => formatoLempira.format(p.total_credito || 0),
  "Monto Pagado": (p) => formatoLempira.format(p.monto_pagado || 0),
  "Fecha de Pago": (p) => (p.fecha_pago ? p.fecha_pago.split("T")[0] : ""),
  Observaciones: (p) => p.observaciones || "",
  Estado: (p) => p.estado || "",
};

/* ======================================
   🔹 COMPONENTE PRINCIPAL
   ====================================== */
export default function Pagos() {
  const navigate = useNavigate();
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.100", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");
  const accent = useColorModeValue("teal.600", "teal.300");

  const [pagos, setPagos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState(
    allColumns.reduce((acc, col) => ({ ...acc, [col]: "" }), {})
  );

  const [selectedPago, setSelectedPago] = useState({
    id_pago: null,
    id_credito: "",
    fecha_pago: "",
    monto_pagado: "",
    monto_pendiente: "",
    observaciones: "",
  });

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [loading, setLoading] = useState(false);

  /* ======================================
     🔹 FUNCIONES API CON apiClient
     ====================================== */
  const fetchPagos = async () => {
    try {
      setLoading(true);
      const res = await api.get("/contabilidad/pagos"); // ✅ UID en headers
      setPagos(res.data);
    } catch (err) {
      console.error("❌ Error cargando pagos:", err);
      toast({
        title: "Error cargando pagos",
        description: err.message,
        status: "error",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const savePago = async () => {
    try {
      const method = selectedPago.id_pago ? "put" : "post";
      const url = selectedPago.id_pago
        ? `/contabilidad/pagos/${selectedPago.id_pago}`
        : `/contabilidad/pagos`;

      const res = await api[method](url, selectedPago); // ✅ Envia UID
      toast({ title: res.data.message || "Pago guardado", status: "success", duration: 2000 });
      fetchPagos();
      onClose();
    } catch (err) {
      console.error("❌ Error guardando pago:", err);
      toast({ title: "Error guardando pago", status: "error" });
    }
  };

  const deletePagos = async () => {
    try {
      for (const id of selectedIds) {
        await api.delete(`/contabilidad/pagos/${id}`); // ✅ apiClient
      }
      toast({ title: "Pagos eliminados", status: "info" });
      setSelectedIds([]);
      fetchPagos();
    } catch (err) {
      console.error("❌ Error eliminando pagos:", err);
    }
  };

  /* ======================================
     🔹 CICLO DE VIDA
     ====================================== */
  useEffect(() => {
    fetchPagos();
  }, []);

  /* ======================================
     🔹 FILTROS
     ====================================== */
  const filteredPagos = useMemo(
    () =>
      pagos.filter((p) =>
        allColumns.every((col) => {
          const v = (filters[col] || "").toLowerCase();
          return (
            !v ||
            columnExtractors[col](p).toString().toLowerCase().includes(v)
          );
        })
      ),
    [pagos, filters]
  );

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  const handleCheckboxChange = (e, id) => {
    setSelectedIds((sel) =>
      e.target.checked ? [...sel, id] : sel.filter((x) => x !== id)
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelectedPago((s) => ({ ...s, [name]: value }));
  };

  const resetForm = () =>
    setSelectedPago({
      id_pago: null,
      id_credito: "",
      fecha_pago: "",
      monto_pagado: "",
      monto_pendiente: "",
      observaciones: "",
    });

  /* ======================================
     🔹 RENDER
     ====================================== */
  return (
    <>
      <Box p={2}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
          <Heading size="md" color={accent} mb={2}>
            Pagos
          </Heading>
        </Flex>
        <Divider mb={14} />
      </Box>

      <Box
        mt={0}
        p={4}
        mx={8}
        bg={bgContainer}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
        minH="500px"
        position="relative"
      >
        <Flex mb={4}>
          <Button size="sm" onClick={() => navigate(-1)}>
            ←
          </Button>
        </Flex>

        {/* Filtros */}
        <Flex mb={4} gap={2} flexWrap="nowrap" overflowX="auto">
          {allColumns.map((col) => (
            <FormControl key={col} w="160px">
              <Input
                name={col}
                value={filters[col]}
                onChange={handleFilterChange}
                placeholder={col}
                bg={bgFilter}
                size="sm"
                h="30px"
                borderRadius="md"
                textAlign="center"
                fontSize="xs"
              />
            </FormControl>
          ))}
        </Flex>

        {/* Botones */}
        <HStack spacing={3} position="absolute" top="-50px" right="16px" zIndex="1">
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem
                  onClick={() => {
                    const pago = pagos.find((p) => p.id_pago === selectedIds[0]);
                    if (pago) {
                      setSelectedPago(pago);
                      onOpen();
                    }
                  }}
                >
                  Editar
                </MenuItem>
                <MenuItem onClick={deletePagos}>Eliminar</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <>
              <Button
                colorScheme="green"
                size="sm"
                onClick={() => {
                  resetForm();
                  onOpen();
                }}
              >
                + Agregar Pago
              </Button>
              <IconButton
                colorScheme="gray"
                size="sm"
                aria-label="Recargar"
                icon={<FaSyncAlt />}
                onClick={fetchPagos}
              />
            </>
          )}
        </HStack>

        {/* Tabla */}
        <Box overflowX="auto" mt="30px">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={
                      selectedIds.length === filteredPagos.length &&
                      filteredPagos.length > 0
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? filteredPagos.map((p) => p.id_pago) : []
                      )
                    }
                  />
                </Th>
                {allColumns.map((col) => (
                  <Th key={col}>{col}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {filteredPagos.map((p) => (
                <Tr key={p.id_pago}>
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(p.id_pago)}
                      onChange={(e) => handleCheckboxChange(e, p.id_pago)}
                    />
                  </Td>
                  {allColumns.map((col) => (
                    <Td key={col}>{columnExtractors[col](p)}</Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Box>

      {/* Modal Agregar / Editar */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg={modalBg}>
          <ModalHeader>
            {selectedPago.id_pago ? "Editar Pago" : "Agregar Pago"}
          </ModalHeader>
          <ModalBody>
            <FormControl mt={3}>
              <Input
                name="id_credito"
                placeholder="ID Crédito"
                value={selectedPago.id_credito}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="fecha_pago"
                type="date"
                value={selectedPago.fecha_pago}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="monto_pagado"
                type="number"
                placeholder="Monto Pagado"
                value={selectedPago.monto_pagado}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="monto_pendiente"
                type="number"
                placeholder="Monto Pendiente"
                value={selectedPago.monto_pendiente}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl mt={3}>
              <Input
                name="observaciones"
                placeholder="Observaciones"
                value={selectedPago.observaciones}
                onChange={handleChange}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={savePago}>
              Guardar
            </Button>
            <Button variant="ghost" ml={3} onClick={onClose}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
