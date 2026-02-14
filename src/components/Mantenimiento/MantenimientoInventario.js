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

// Simulación de datos de inventario
const initialInventario = [
  { id: 1, producto: "Producto A", cantidad: 100, precio: 50, estado: "Disponible" },
  { id: 2, producto: "Producto B", cantidad: 200, precio: 30, estado: "Disponible" },
  { id: 3, producto: "Producto C", cantidad: 50, precio: 70, estado: "Agotado" },
  { id: 4, producto: "Producto D", cantidad: 150, precio: 45, estado: "Disponible" },
  { id: 5, producto: "Producto E", cantidad: 0, precio: 120, estado: "Agotado" },
];

// Constantes y utilidades
const COMPANY_NAME = "Extractus";
const REPORT_TITLE = "Reporte de Inventario";

const excelCol = (n) => {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};

const allColumns = ["ID", "Producto", "Cantidad", "Precio", "Estado"];

// Extraer datos de las columnas
const columnExtractors = {
  ID: (u) => u.id,
  Producto: (u) => u.producto,
  Cantidad: (u) => u.cantidad,
  Precio: (u) => u.precio,
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

  doc.save("reporte_inventario.pdf");
};

// Función de exportación a Excel
const exportToExcel = async (data, columns) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Inventario");

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
  saveAs(new Blob([buf]), "reporte_inventario.xlsx");
};

// Componente principal para mantenimiento de inventarios
const MantenimientoInventario = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const [inventario, setInventario] = useState(initialInventario);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [filters, setFilters] = useState({ producto: "", cantidad: "", estado: "" });

  // Función para manejar los cambios en los filtros
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((f) => ({ ...f, [name]: value }));
  };

  // Función para editar un producto
  const handleEditProducto = (producto) => {
    setSelectedProducto({ ...producto });
    onOpen();
  };

  // Función para eliminar un producto
  const handleDeleteProducto = (id) => {
    setInventario((prevInventario) => prevInventario.filter((producto) => producto.id !== id));
    toast({
      title: "Producto eliminado",
      status: "error",
    });
  };

  // Función para guardar o agregar un producto
  const handleSaveProducto = () => {
    if (selectedProducto.id) {
      setInventario((prevInventario) =>
        prevInventario.map((producto) =>
          producto.id === selectedProducto.id ? selectedProducto : producto
        )
      );
    } else {
      setInventario((prevInventario) => [
        ...prevInventario,
        { ...selectedProducto, id: inventario.length + 1 },
      ]);
    }
    onClose();
    setSelectedProducto(null);
    toast({
      title: selectedProducto.id ? "Producto editado" : "Producto agregado",
      status: "success",
    });
  };

  // Filtrar los productos
  const filteredInventario = inventario.filter((producto) =>
    Object.entries(filters).every(([key, val]) => !val || producto[key]?.toString().toLowerCase().includes(val.toLowerCase()))
  );

  return (
    <Box p={5}>
      <Heading mb={6}>Mantenimiento de Inventario</Heading>

      {/* Botón de retroceso */}
      <Button mb={2} size="sm" onClick={() => window.history.back()}>
        ←
      </Button>

      {/* Botones de acción alineados a la derecha */}
      <HStack spacing={3} justify="flex-end" mb={4}>
        <Button
          colorScheme="green"
          onClick={() => {
            setSelectedProducto({ id: null, producto: "", cantidad: 0, precio: 0, estado: "Disponible" });
            onOpen();
          }}
          leftIcon={<FaPlus />}
        >
          Agregar Producto
        </Button>

        <Menu>
          <MenuButton as={Button} colorScheme="green" rightIcon={<FaFilePdf />}>
            Reporte
          </MenuButton>
          <MenuList>
            <MenuItem
              icon={<FaFilePdf />}
              onClick={() => exportToPDF(filteredInventario, allColumns)}
            >
              Exportar a PDF
            </MenuItem>
            <MenuItem
              icon={<FaFileExcel />}
              onClick={() => exportToExcel(filteredInventario, allColumns)}
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
          <Input
            name="cantidad"
            value={filters.cantidad}
            onChange={handleFilterChange}
            placeholder="Filtrar por cantidad"
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
            <option value="Disponible">Disponible</option>
            <option value="Agotado">Agotado</option>
          </Select>
        </FormControl>
      </Flex>

      {/* Tabla de inventario */}
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Producto</Th>
            <Th>Cantidad</Th>
            <Th>Precio</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredInventario.map((producto) => (
            <Tr key={producto.id}>
              <Td>{producto.id}</Td>
              <Td>{producto.producto}</Td>
              <Td>{producto.cantidad}</Td>
              <Td>{producto.precio}</Td>
              <Td>{producto.estado}</Td>
              <Td>
                <IconButton
                  icon={<FaEdit />}
                  colorScheme="yellow"
                  onClick={() => handleEditProducto(producto)}
                  size="sm"
                  mr={2}
                />
                <IconButton
                  icon={<FaTrash />}
                  colorScheme="red"
                  onClick={() => handleDeleteProducto(producto.id)}
                  size="sm"
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* Modal para agregar o editar producto */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedProducto?.id ? "Editar Producto" : "Agregar Producto"}
          </ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Producto</FormLabel>
              <Input
                name="producto"
                value={selectedProducto?.producto || ""}
                onChange={(e) => setSelectedProducto({ ...selectedProducto, producto: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Cantidad</FormLabel>
              <Input
                name="cantidad"
                value={selectedProducto?.cantidad || ""}
                onChange={(e) => setSelectedProducto({ ...selectedProducto, cantidad: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Precio</FormLabel>
              <Input
                name="precio"
                value={selectedProducto?.precio || ""}
                onChange={(e) => setSelectedProducto({ ...selectedProducto, precio: e.target.value })}
              />
            </FormControl>
            <FormControl mt={3}>
              <FormLabel>Estado</FormLabel>
              <Select
                name="estado"
                value={selectedProducto?.estado || "Disponible"}
                onChange={(e) => setSelectedProducto({ ...selectedProducto, estado: e.target.value })}
              >
                <option value="Disponible">Disponible</option>
                <option value="Agotado">Agotado</option>
              </Select>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button colorScheme="blue" onClick={handleSaveProducto}>
              {selectedProducto?.id ? "Guardar Cambios" : "Agregar Producto"}
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

export default MantenimientoInventario;
