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

// Datos de ejemplo de facturas
const initialFacturas = [
  { id: 1, cliente: "Juan Madrid", producto: "Producto 1", cantidad: 2, total: 200, fecha: "2025-08-01", estado: "Pendiente" },
  { id: 2, cliente: "Eduardo Gavarrete", producto: "Producto 2", cantidad: 3, total: 450, fecha: "2025-07-30", estado: "Pagado" },
];

// Constantes y utilidades
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Facturas";

const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

const allColumns = ["ID", "Cliente", "Producto", "Cantidad", "Total", "Fecha", "Estado"];

// Extraer datos de las columnas
const columnExtractors = {
  ID: (u) => u.id,
  Cliente: (u) => u.cliente,
  Producto: (u) => u.producto,
  Cantidad: (u) => u.cantidad,
  Total: (u) => u.total,
  Fecha: (u) => u.fecha,
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

  doc.save("reporte_facturas.pdf");
};

// Función de exportación a Excel
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Facturas");

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
  saveAs(new Blob([buf]), "reporte_facturas.xlsx");
};

// Componente principal para mantenimiento de facturas
const MantenimientoFactura = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [facturas, setFacturas] = useState(initialFacturas);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [filters, setFilters] = useState({ cliente: "", producto: "", fecha: "", estado: "" });

  // Función para manejar los cambios en los filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  // Función para editar una factura
  const handleEditFactura = (factura) => {
    setSelectedFactura({ ...factura });
    onOpen();
  };

  // Función para eliminar una factura
  const handleDeleteFactura = (id) => {
    setFacturas((prevFacturas) => prevFacturas.filter((factura) => factura.id !== id));
    toast({
      title: "Factura eliminada",
      status: "error",
    });
  };

  // Función para guardar o agregar una factura
  const handleSaveFactura = () => {
    if (selectedFactura.id) {
      setFacturas((prevFacturas) =>
        prevFacturas.map((factura) =>
          factura.id === selectedFactura.id ? selectedFactura : factura
        )
      );
    } else {
      setFacturas((prevFacturas) => [
        ...prevFacturas,
        { ...selectedFactura, id: facturas.length + 1 },
      ]);
    }
    onClose();
    setSelectedFactura(null);
    toast({
      title: selectedFactura.id ? "Factura editada" : "Factura agregada",
      status: "success",
    });
  };

  // Filtrar las facturas
  const filteredFacturas = facturas.filter((factura) =>
    Object.entries(filters).every(([key, val]) => !val || factura[key]?.toString().toLowerCase().includes(val.toLowerCase()))
  );

  return (
    <Box p={5}>
      <Heading mb={6}>Mantenimiento de Facturas</Heading>

      {/* Botón de retroceso */}
      <Button mb={2} size="sm" onClick={() => window.history.back()}>
        ←
      </Button>

      {/* Botones de acción alineados a la derecha */}
      <HStack spacing={3} justify="flex-end" mb={4}>
        <Button
          colorScheme="green"
          onClick={() => {
            setSelectedFactura({ id: null, cliente: "", producto: "", cantidad: 0, total: 0, fecha: "", estado: "Pendiente" });
            onOpen();
          }}
          leftIcon={<FaPlus />}
        >
          Agregar Factura
        </Button>

        <Menu>
          <MenuButton as={Button} colorScheme="green" rightIcon={<FaFilePdf />}>
            Reporte
          </MenuButton>
          <MenuList>
            <MenuItem
              icon={<FaFilePdf />}
              onClick={() => exportToPDF(filteredFacturas, allColumns)}
            >
              Exportar a PDF
            </MenuItem>
            <MenuItem
              icon={<FaFileExcel />}
              onClick={() => exportToExcel(filteredFacturas, allColumns)}
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
            name="cliente"
            value={filters.cliente}
            onChange={handleFilterChange}
            placeholder="Filtrar por cliente"
            fontSize="xs"
            size="xs"
            h="30px"
            borderRadius="md"
            textAlign="center"
          />
        </FormControl>
        <FormControl w="auto">
          <Input
            name="producto"
            value={filters.producto}
            onChange={handleFilterChange}
            placeholder="Filtrar por producto"
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
            <option value="Pendiente">Pendiente</option>
            <option value="Pagado">Pagado</option>
          </Select>
        </FormControl>
      </Flex>

      {/* Tabla de facturas */}
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Cliente</Th>
            <Th>Producto</Th>
            <Th>Cantidad</Th>
            <Th>Total</Th>
            <Th>Fecha</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredFacturas.map((factura) => (
            <Tr key={factura.id}>
              <Td>{factura.id}</Td>
              <Td>{factura.cliente}</Td>
              <Td>{factura.producto}</Td>
              <Td>{factura.cantidad}</Td>
              <Td>{factura.total}</Td>
              <Td>{factura.fecha}</Td>
              <Td>{factura.estado}</Td>
              <Td>
                <IconButton
                  icon={<FaEdit />}
                  colorScheme="yellow"
                  onClick={() => handleEditFactura(factura)}
                  size="sm"
                  mr={2}
                />
                <IconButton
                  icon={<FaTrash />}
                  colorScheme="red"
                  onClick={() => handleDeleteFactura(factura.id)}
                  size="sm"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal para agregar o editar factura */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedFactura?.id ? "Editar Factura" : "Agregar Factura"}
          </ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Cliente</FormLabel>
              <Input
                name="cliente"
                value={selectedFactura?.cliente || ""}
                onChange={(e) => setSelectedFactura({ ...selectedFactura, cliente: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Producto</FormLabel>
              <Input
                name="producto"
                value={selectedFactura?.producto || ""}
                onChange={(e) => setSelectedFactura({ ...selectedFactura, producto: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Cantidad</FormLabel>
              <Input
                name="cantidad"
                value={selectedFactura?.cantidad || ""}
                onChange={(e) => setSelectedFactura({ ...selectedFactura, cantidad: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Total</FormLabel>
              <Input
                name="total"
                value={selectedFactura?.total || ""}
                onChange={(e) => setSelectedFactura({ ...selectedFactura, total: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Estado</FormLabel>
              <Select
                name="estado"
                value={selectedFactura?.estado || "Pendiente"}
                onChange={(e) => setSelectedFactura({ ...selectedFactura, estado: e.target.value })}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Pagado">Pagado</option>
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={handleSaveFactura}>
              {selectedFactura?.id ? "Guardar Cambios" : "Agregar Factura"}
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

export default MantenimientoFactura;
