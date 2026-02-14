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
import { FaSyncAlt, FaFilePdf, FaFileExcel, FaPlus, FaTrash, FaEdit } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import logo from "../login/log.png"; // Asegúrate de tener el logo en la ruta correcta

// Datos de ejemplo de proveedores
const initialProveedores = [
  { id: 1, nombre: "Proveedor 1", rtn: "123456789", correo: "proveedor1@example.com", estado: "Activo" },
  { id: 2, nombre: "Proveedor 2", rtn: "987654321", correo: "proveedor2@example.com", estado: "Inactivo" },
];

// Constantes y utilidades
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Proveedores";

const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

const allColumns = ["ID", "Nombre", "RTN", "Correo", "Estado"];

// Extraer datos de las columnas
const columnExtractors = {
  ID: (u) => u.id,
  Nombre: (u) => u.nombre,
  RTN: (u) => u.rtn,
  Correo: (u) => u.correo,
  Estado: (u) => u.estado,
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

  doc.save("reporte_proveedores.pdf");
};

// Función de exportación a Excel
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Proveedores");

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
  saveAs(new Blob([buf]), "reporte_proveedores.xlsx");
};

// Componente principal para mantenimiento de proveedores
const MantenimientoProveedores = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [proveedores, setProveedores] = useState(initialProveedores);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [filters, setFilters] = useState({ nombre: "", rtn: "", correo: "", estado: "" });

  // Función para manejar los cambios en los filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  // Función para editar un proveedor
  const handleEditProveedor = (proveedor) => {
    setSelectedProveedor({ ...proveedor });
    onOpen();
  };

  // Función para eliminar un proveedor
  const handleDeleteProveedor = (id) => {
    setProveedores((prevProveedores) => prevProveedores.filter((proveedor) => proveedor.id !== id));
    toast({
      title: "Proveedor eliminado",
      status: "error",
    });
  };

  // Función para guardar o agregar un proveedor
  const handleSaveProveedor = () => {
    if (selectedProveedor.id) {
      setProveedores((prevProveedores) =>
        prevProveedores.map((proveedor) =>
          proveedor.id === selectedProveedor.id ? selectedProveedor : proveedor
        )
      );
    } else {
      setProveedores((prevProveedores) => [
        ...prevProveedores,
        { ...selectedProveedor, id: proveedores.length + 1 },
      ]);
    }
    onClose();
    setSelectedProveedor(null);
    toast({
      title: selectedProveedor.id ? "Proveedor editado" : "Proveedor agregado",
      status: "success",
    });
  };

  // Filtrar los proveedores
  const filteredProveedores = proveedores.filter((proveedor) =>
    Object.entries(filters).every(([key, val]) => !val || proveedor[key]?.toString().toLowerCase().includes(val.toLowerCase()))
  );

  return (
    <Box p={5}>
      <Heading mb={6}>Mantenimiento de Proveedores</Heading>

      {/* Botón de retroceso */}
      <Button mb={2} size="sm" onClick={() => window.history.back()}>
        ←
      </Button>

      {/* Botones de acción alineados a la derecha */}
      <HStack spacing={3} justify="flex-end" mb={4}>
        <Button
          colorScheme="green"
          onClick={() => {
            setSelectedProveedor({ id: null, nombre: "", rtn: "", correo: "", estado: "Activo" });
            onOpen();
          }}
          leftIcon={<FaPlus />}
        >
          Agregar Proveedor
        </Button>

        <Menu>
          <MenuButton as={Button} colorScheme="green" rightIcon={<FaFilePdf />}>
            Reporte
          </MenuButton>
          <MenuList>
            <MenuItem
              icon={<FaFilePdf />}
              onClick={() => exportToPDF(filteredProveedores, allColumns)}
            >
              Exportar a PDF
            </MenuItem>
            <MenuItem
              icon={<FaFileExcel />}
              onClick={() => exportToExcel(filteredProveedores, allColumns)}
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
            name="nombre"
            value={filters.nombre}
            onChange={handleFilterChange}
            placeholder="Filtrar por nombre"
            fontSize="xs"
            size="xs"
            h="30px"
            borderRadius="md"
            textAlign="center"
          />
        </FormControl>
        <FormControl w="auto">
          <Input
            name="rtn"
            value={filters.rtn}
            onChange={handleFilterChange}
            placeholder="Filtrar por RTN"
            fontSize="xs"
            size="xs"
            h="30px"
            borderRadius="md"
            textAlign="center"
          />
        </FormControl>
        <FormControl w="auto">
          <Input
            name="correo"
            value={filters.correo}
            onChange={handleFilterChange}
            placeholder="Filtrar por correo"
            fontSize="xs"
            size="xs"
            h="30px"
            borderRadius="md"
            textAlign="center"
          />
        </FormControl>
        <FormControl w="auto">
          <Select
            name="estado"
            value={filters.estado}
            onChange={handleFilterChange}
            fontSize="xs"
            size="xs"
            h="30px"
            borderRadius="md"
          >
            <option value="">Filtrar por estado</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </Select>
        </FormControl>
      </Flex>

      {/* Tabla de proveedores */}
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Nombre</Th>
            <Th>RTN</Th>
            <Th>Correo</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredProveedores.map((proveedor) => (
            <Tr key={proveedor.id}>
              <Td>{proveedor.id}</Td>
              <Td>{proveedor.nombre}</Td>
              <Td>{proveedor.rtn}</Td>
              <Td>{proveedor.correo}</Td>
              <Td>{proveedor.estado}</Td>
              <Td>
                <IconButton
                  icon={<FaEdit />}
                  colorScheme="yellow"
                  onClick={() => handleEditProveedor(proveedor)}
                  size="sm"
                  mr={2}
                />
                <IconButton
                  icon={<FaTrash />}
                  colorScheme="red"
                  onClick={() => handleDeleteProveedor(proveedor.id)}
                  size="sm"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal para agregar o editar proveedor */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedProveedor?.id ? "Editar Proveedor" : "Agregar Proveedor"}
          </ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Nombre</FormLabel>
              <Input
                name="nombre"
                value={selectedProveedor?.nombre || ""}
                onChange={(e) => setSelectedProveedor({ ...selectedProveedor, nombre: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>RTN</FormLabel>
              <Input
                name="rtn"
                value={selectedProveedor?.rtn || ""}
                onChange={(e) => setSelectedProveedor({ ...selectedProveedor, rtn: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Correo</FormLabel>
              <Input
                name="correo"
                value={selectedProveedor?.correo || ""}
                onChange={(e) => setSelectedProveedor({ ...selectedProveedor, correo: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Estado</FormLabel>
              <Select
                name="estado"
                value={selectedProveedor?.estado || "Activo"}
                onChange={(e) => setSelectedProveedor({ ...selectedProveedor, estado: e.target.value })}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={handleSaveProveedor}>
              {selectedProveedor?.id ? "Guardar Cambios" : "Agregar Proveedor"}
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

export default MantenimientoProveedores;
