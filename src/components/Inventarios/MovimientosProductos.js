// ============================================================
// 💎 Movimientos de Productos (Versión Empresarial Adaptada)
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box, Table, Thead, Tbody, Tr, Th, Td,
  Heading, Spinner, useToast, Button,
  HStack, Flex, Input, Card, SimpleGrid,
  Text, Modal, ModalBody, ModalHeader,
  ModalOverlay, ModalContent, ModalFooter, ModalCloseButton,
  Select 
} from "@chakra-ui/react";

import { FaPlus, FaSync, FaBroom, FaFilePdf, FaFileExcel } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient";
import logoSrc from "../login/log.png";

export default function MovimientosProductos() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);

  // Campos del modal
  const [nuevo, setNuevo] = useState({
    id_producto: "",
    tipo_movimiento: "",
    cantidad: "",
    unidad_medida: "",
    observacion: "",
    origen: "",
    id_origen: "",
    id_detalle_op: "",
    id_orden_produccion: ""
  });

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const toast = useToast();

  // ============================================================
  // 📡 Cargar movimientos
  // ============================================================
  const cargarMovimientos = async (params = null) => {
    try {
      setLoading(true);

      const { data } = await api.get("/inventario/movimientos-productos", {
        params,
      });

      setMovimientos(data || []);
    } catch (error) {
      toast({
        title: "Error al cargar movimientos",
        description: error.message,
        status: "error",
        duration: 3000,
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔹 Cargar productos para el select
  // ============================================================
  const cargarProductos = async () => {
    try {
      const { data } = await api.get("/produccion/productos");
      setProductos(data);
    } catch (err) {
      console.error(err);
    }
  };

  // ============================================================
  // 🎯 Filtros automáticos
  // ============================================================
  useEffect(() => {
    const filtros = {};
    if (fechaInicio) filtros.fecha_inicio = fechaInicio;
    if (fechaFin) filtros.fecha_fin = fechaFin;

    if (fechaInicio || fechaFin) cargarMovimientos(filtros);
    else cargarMovimientos();

    cargarProductos();
  }, [fechaInicio, fechaFin]);

  // ============================================================
  // 🧽 Limpiar filtros
  // ============================================================
  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
  };

  // ============================================================
  // ➕ Registrar Movimiento (Entrada / Salida) 
  // ============================================================
  const registrarMovimiento = async () => {
    try {
      await api.post("/inventario/movimiento-producto", nuevo);

      toast({
        title: "Movimiento registrado",
        status: "success",
        duration: 3000,
      });

      setModal(false);
      cargarMovimientos();
    } catch (err) {
      toast({
        title: "Error al registrar",
        description: err.message,
        status: "error",
      });
    }
  };

  // ============================================================
  // 📝 Exportar PDF
  // ============================================================
  const exportarPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");

    doc.addImage(logoSrc, "PNG", 15, 10, 20, 20);
    doc.setFontSize(16);
    doc.text("Historial de Movimientos de Productos", 105, 20, { align: "center" });

    autoTable(doc, {
      startY: 35,
      head: [["ID", "Producto", "Tipo", "Cantidad", "UM", "Fecha", "Usuario"]],
      body: movimientos.map((m) => [
        m.id_movimiento,
        m.nombre_producto,
        m.tipo_movimiento,
        m.cantidad,
        m.unidad_medida,
        new Date(m.fecha_movimiento).toLocaleString("es-HN"),
        m.usuario_registro,
      ]),
    });

    doc.save("Movimientos_Productos.pdf");
  };

  // ============================================================
  // 📊 Exportar Excel
  // ============================================================
  const exportarExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Movimientos Productos");

    ws.addRow(["ID", "Producto", "Tipo", "Cantidad", "UM", "Fecha", "Usuario", "Observación"]);

    movimientos.forEach((m) => {
      ws.addRow([
        m.id_movimiento,
        m.nombre_producto,
        m.tipo_movimiento,
        m.cantidad,
        m.unidad_medida,
        new Date(m.fecha_movimiento).toLocaleString("es-HN"),
        m.usuario_registro,
        m.observacion,
      ]);
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "Movimientos_Productos.xlsx");
  };

  // ============================================================
  // 🖥️ RENDER
  // ============================================================
  return (
    <Box p={6}>

      {/* DASHBOARD */}
      <SimpleGrid columns={[1, 4]} spacing={4} mb={6}>
        <Card p={4}><Text>Total</Text><Text fontSize="2xl">{movimientos.length}</Text></Card>
        <Card p={4}><Text>Entradas</Text><Text fontSize="2xl" color="green.600">{movimientos.filter(x => x.tipo_movimiento === "Entrada").length}</Text></Card>
        <Card p={4}><Text>Salidas</Text><Text fontSize="2xl" color="red.600">{movimientos.filter(x => x.tipo_movimiento === "Salida").length}</Text></Card>
        <Card p={4}><Text>Último</Text><Text>{movimientos[0] ? new Date(movimientos[0].fecha_movimiento).toLocaleString("es-HN") : "—"}</Text></Card>
      </SimpleGrid>

      {/* BOTONES */}
      <Flex justify="space-between" mb={5}>
        <Heading size="md" color="teal.700">Movimientos de Productos</Heading>

        <HStack>
          <Button leftIcon={<FaPlus />} colorScheme="green" onClick={() => setModal(true)}>Nuevo</Button>
          <Button leftIcon={<FaBroom />} onClick={limpiarFiltros}>Limpiar</Button>
          <Button leftIcon={<FaSync />} colorScheme="teal" onClick={() => cargarMovimientos()}>Refrescar</Button>
          <Button leftIcon={<FaFilePdf />} colorScheme="red" onClick={exportarPDF}>PDF</Button>
          <Button leftIcon={<FaFileExcel />} colorScheme="green" onClick={exportarExcel}>Excel</Button>
        </HStack>
      </Flex>

      {/* FILTROS */}
      <HStack mb={4}>
        <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} maxW="200px" />
        <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} maxW="200px" />
      </HStack>

      {/* TABLA */}
      <Table size="sm">
        <Thead bg="gray.100">
          <Tr>
            <Th>ID</Th>
            <Th>Producto</Th>
            <Th>Tipo</Th>
            <Th>Cantidad</Th>
            <Th>UM</Th>
            <Th>Fecha</Th>
            <Th>Usuario</Th>
            <Th>Observación</Th>
          </Tr>
        </Thead>

        <Tbody>
          {loading ? (
            <Tr><Td colSpan={8} textAlign="center"><Spinner /></Td></Tr>
          ) : movimientos.map((m) => (
            <Tr key={m.id_movimiento}>
              <Td>{m.id_movimiento}</Td>
              <Td>{m.nombre_producto}</Td>
              <Td color={m.tipo_movimiento === "Entrada" ? "green.600" : "red.600"}>{m.tipo_movimiento}</Td>
              <Td>{m.cantidad}</Td>
              <Td>{m.unidad_medida || "—"}</Td>
              <Td>{new Date(m.fecha_movimiento).toLocaleString("es-HN")}</Td>
              <Td>{m.usuario_registro}</Td>
              <Td>{m.observacion || "—"}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {/* ============================================================
         MODAL: Registrar Movimiento
      ============================================================ */}
      <Modal isOpen={modal} onClose={() => setModal(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Registrar Movimiento</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            
            <Select placeholder="Seleccione un producto"
              value={nuevo.id_producto}
              onChange={e => setNuevo({ ...nuevo, id_producto: e.target.value })}
              mb={3}>
              {productos.map(p => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre_producto}
                </option>
              ))}
            </Select>

            <Select placeholder="Tipo de Movimiento"
              value={nuevo.tipo_movimiento}
              onChange={e => setNuevo({ ...nuevo, tipo_movimiento: e.target.value })}
              mb={3}>
              <option value="Entrada">Entrada</option>
              <option value="Salida">Salida</option>
            </Select>

            <Input placeholder="Cantidad"
              type="number"
              value={nuevo.cantidad}
              onChange={e => setNuevo({ ...nuevo, cantidad: e.target.value })}
              mb={3}
            />

            <Input placeholder="Unidad de medida"
              value={nuevo.unidad_medida}
              onChange={e => setNuevo({ ...nuevo, unidad_medida: e.target.value })}
              mb={3}
            />

            <Input placeholder="Observación"
              value={nuevo.observacion}
              onChange={e => setNuevo({ ...nuevo, observacion: e.target.value })}
              mb={3}
            />

            <Select placeholder="Origen"
              value={nuevo.origen}
              onChange={e => setNuevo({ ...nuevo, origen: e.target.value })}
              mb={3}>
              <option value="Manual">Manual</option>
              <option value="Producción">Producción</option>
              <option value="Orden Producción">Orden de Producción</option>
              <option value="Otros">Otros</option>
            </Select>

            <Input placeholder="ID Origen" value={nuevo.id_origen}
              onChange={e => setNuevo({ ...nuevo, id_origen: e.target.value })}
              mb={3}
            />

            <Input placeholder="ID Detalle OP"
              value={nuevo.id_detalle_op}
              onChange={e => setNuevo({ ...nuevo, id_detalle_op: e.target.value })}
              mb={3}
            />

            <Input placeholder="ID Orden Producción"
              value={nuevo.id_orden_produccion}
              onChange={e => setNuevo({ ...nuevo, id_orden_produccion: e.target.value })}
              mb={3}
            />

          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={registrarMovimiento}>Guardar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
}
