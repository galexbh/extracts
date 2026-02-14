import React, { useState } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  IconButton,
  Select,
  useDisclosure,
  useToast,
  Heading,
  Divider,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { FaSyncAlt, FaFilePdf, FaFileExcel, FaPlus, FaTrash, FaEdit, FaArrowLeft } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png"; // Asegúrate de tener el logo en la ruta correcta

// Datos de ejemplo de estados de clientes
const initialStates = [
  { id: 1, nombre_estado: "Activo" },
  { id: 2, nombre_estado: "Inactivo" },
];

// Constantes y utilidades
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Estados de Clientes";

const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

const allColumns = ["ID", "Estado"];

// Extraer datos de las columnas
const columnExtractors = {
  ID: (u) => u.id,
  Estado: (u) => u.nombre_estado,
};

// Función de exportación a PDF
const exportToPDF = (data, columns) => {
  const doc = new jsPDF();
  const m = 14;
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateStr = new Date().toLocaleDateString("es-ES");

  doc.setFontSize(18).setTextColor(46, 125, 50).text(COMPANY_NAME, w / 2, 20, { align: "center" });
  doc.setFontSize(14).setTextColor(102, 187, 106).text(REPORT_TITLE, w / 2, 30, { align: "center" });
  doc.setFontSize(10).setTextColor(0).text(`Fecha: ${dateStr}`, m, 20);

  try {
    const img = doc.getImageProperties(logo);
    const imgW = 20;
    const imgH = (img.height * imgW) / img.width;
    doc.addImage(logo, "PNG", w - imgW - m, 8, imgW, imgH);
  } catch {}

  doc.setDrawColor(0).setLineWidth(0.5).line(m, 35, w - m, 35);

  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: data.map((row) => columns.map((c) => columnExtractors[c](row))),
    theme: "grid",
    headStyles: { fillColor: [200, 255, 200], textColor: [0, 80, 0] },
    margin: { left: m, right: m },
    styles: { fontSize: 8, cellPadding: 2, halign: "center" },
    didDrawPage: () => {
      const p = doc.internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(10).setTextColor(0).text(`Página ${p}`, w / 2, h - 10, { align: "center" });
    },
  });

  doc.save("reporte_estados_cliente.pdf");
};

// Función de exportación a Excel
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Estados de Clientes");

  const dateStr = new Date().toLocaleDateString("es-ES");
  const lastCol = excelCol(columns.length || 1);

  ws.mergeCells(`A1:${lastCol}1`);
  Object.assign(ws.getCell("A1"), {
    value: COMPANY_NAME,
    font: { size: 14, bold: true, color: { argb: "2E7D32" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(1).height = 24;

  ws.mergeCells(`A2:${lastCol}2`);
  Object.assign(ws.getCell("A2"), {
    value: REPORT_TITLE,
    font: { size: 12, bold: true, color: { argb: "66BB6A" } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${lastCol}3`);
  Object.assign(ws.getCell("A3"), {
    value: `Fecha: ${dateStr}`,
    font: { size: 10 },
    alignment: { horizontal: "left", vertical: "middle" },
  });
  ws.getRow(3).height = 18;

  ws.addRow([]);

  const hdr = ws.addRow(columns);
  hdr.height = 20;
  hdr.eachCell((cell) => {
    Object.assign(cell, {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "CCFFCC" } },
      font: { bold: true, color: { argb: "005000" } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    });
  });

  data.forEach((row) => {
    const r = ws.addRow(columns.map((c) => columnExtractors[c](row)));
    r.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
  });

  ws.columns.forEach((col) => {
    const vals = col.values.slice(1);
    const mx = vals.reduce((m, v) => Math.max(m, (v ?? "").toString().length), 0);
    col.width = Math.min(mx + 5, 40);
  });

  ws.headerFooter = { oddFooter: "&CPágina &P" };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), "reporte_estados_cliente.xlsx");
};

// Componente principal para mantenimiento de estados de clientes
const MantenimientoClientes = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [states, setStates] = useState(initialStates);
  const [selectedState, setSelectedState] = useState(null);
  const [filters, setFilters] = useState({ nombre_estado: "" });

  // Función para manejar los cambios en los filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  // Función para editar un estado
  const handleEditState = (state) => {
    setSelectedState({ ...state });
    onOpen();
  };

  // Función para eliminar un estado
  const handleDeleteState = (id) => {
    setStates((prevStates) => prevStates.filter((state) => state.id !== id));
    toast({
      title: "Estado eliminado",
      status: "error",
    });
  };

  // Función para guardar o agregar un estado
  const handleSaveState = () => {
    if (selectedState.id) {
      setStates((prevStates) =>
        prevStates.map((state) =>
          state.id === selectedState.id ? selectedState : state
        )
      );
    } else {
      setStates((prevStates) => [
        ...prevStates,
        { ...selectedState, id: states.length + 1 },
      ]);
    }
    onClose();
    setSelectedState(null);
    toast({
      title: selectedState.id ? "Estado editado" : "Estado agregado",
      status: "success",
    });
  };

  // Filtrar los estados
  const filteredStates = states.filter((state) =>
    state.nombre_estado.toLowerCase().includes(filters.nombre_estado.toLowerCase())
  );

  return (
    <Box p={5}>
      <Heading mb={6}>Mantenimiento de Estados de Cliente</Heading>

      {/* Botón de retroceso */}
      <Button mb={2} size="sm" onClick={() => window.history.back()}>
        ←
      </Button>

      {/* Botones de acción alineados a la derecha */}
      <HStack spacing={3} justify="flex-end" mb={4}>
        <Button
          colorScheme="green"
          onClick={() => {
            setSelectedState({ id: null, nombre_estado: "" });
            onOpen();
          }}
          leftIcon={<FaPlus />}
        >
          Agregar Estado
        </Button>

        <Menu>
          <MenuButton as={Button} colorScheme="green" rightIcon={<FaFilePdf />}>
            Reporte
          </MenuButton>
          <MenuList>
            <MenuItem
              icon={<FaFilePdf />}
              onClick={() => exportToPDF(filteredStates, allColumns)}
            >
              Exportar a PDF
            </MenuItem>
            <MenuItem
              icon={<FaFileExcel />}
              onClick={() => exportToExcel(filteredStates, allColumns)}
            >
              Exportar a Excel
            </MenuItem>
          </MenuList>
        </Menu>

        <IconButton
          colorScheme="gray"
          size="sm"
          aria-label="Recargar"
          icon={<FaSyncAlt />}
          onClick={() => window.location.reload()}
        />
      </HStack>

      {/* Filtros */}
      <Flex mb={4} justify="center" align="center" wrap="wrap" gap={2}>
        <FormControl w="auto">
          <Input
            name="nombre_estado"
            value={filters.nombre_estado}
            onChange={handleFilterChange}
            placeholder="Filtrar por estado"
            fontSize="xs"
            size="xs"
            h="30px"
            borderRadius="md"
            textAlign="center"
          />
        </FormControl>
      </Flex>

      {/* Tabla de estados */}
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredStates.map((state) => (
            <Tr key={state.id}>
              <Td>{state.id}</Td>
              <Td>{state.nombre_estado}</Td>
              <Td>
                <IconButton
                  icon={<FaEdit />}
                  colorScheme="yellow"
                  onClick={() => handleEditState(state)}
                  size="sm"
                  mr={2}
                />
                <IconButton
                  icon={<FaTrash />}
                  colorScheme="red"
                  onClick={() => handleDeleteState(state.id)}
                  size="sm"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal para agregar o editar estado */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedState?.id ? "Editar Estado" : "Agregar Estado"}
          </ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Nombre del Estado</FormLabel>
              <Input
                name="nombre_estado"
                value={selectedState?.nombre_estado || ""}
                onChange={(e) =>
                  setSelectedState({ ...selectedState, nombre_estado: e.target.value })
                }
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={handleSaveState}>
              {selectedState?.id ? "Guardar Cambios" : "Agregar Estado"}
            </Button>
            <Button variant="ghost" onClick={onClose} ml={3}>
              Cancelar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MantenimientoClientes;