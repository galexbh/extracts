// ============================================================
// 📂 src/components/Seguridad/Bitacora.js
// ============================================================
import React, { useEffect, useState } from "react";
import {
  Box, Heading, Table, Thead, Tbody, Tr, Th, Td,
  Spinner, Text, HStack, Input, Button, useToast,
  IconButton, Select, Flex, Badge
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, RepeatIcon, DownloadIcon } from "@chakra-ui/icons";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "../../api/apiClient"; // ✅ Cliente Axios centralizado

export default function Bitacora() {
  // ============================================================
  // 🎯 Estados
  // ============================================================
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [error, setError] = useState("");

  // Paginación
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const toast = useToast();

  // ============================================================
  // 🔄 Cargar datos desde backend
  // ============================================================
  const load = async (currentPage = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: currentPage,
        limit
      };

      if (usuario) params.usuario = usuario;
      if (tabla) params.tabla = tabla;
      if (accion) params.accion = accion;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get("/bitacora", { params });

      if (data && Array.isArray(data.rows)) {
        setRows(data.rows);
        setTotalPages(data.totalPages);
        setPage(data.page);
        setTotalRecords(data.total);
      } else {
        // Fallback en caso de que la respuesta no tenga el formato esperado
        setRows([]);
        setTotalPages(1);
        setTotalRecords(0);
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar la bitácora");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando cambie la página o el límite (pero no al escribir filtros)
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Manejar búsqueda manual
  const handleSearch = () => {
    setPage(1); // Resetear a página 1 al filtrar
    load(1);
  };

  // Limpiar filtros
  const handleClear = () => {
    setUsuario("");
    setTabla("");
    setAccion("");
    setDesde("");
    setHasta("");
    setPage(1);
    load(1);
  };

  // ============================================================
  // 📤 Exportar a PDF
  // ============================================================
  // ============================================================
  // 📤 Exportar a PDF (Reporte Completo)
  // ============================================================
  const [exporting, setExporting] = useState(false);

  const exportPDF = async () => {
    try {
      setExporting(true);

      // 1. Obtener TODOS los registros s/ filtros actuales
      // Usamos un limit alto o el totalRecords si ya lo tenemos
      const limitExport = totalRecords > 0 ? totalRecords : 10000;

      const params = {
        page: 1,
        limit: limitExport
      };

      if (usuario) params.usuario = usuario;
      if (tabla) params.tabla = tabla;
      if (accion) params.accion = accion;
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const { data } = await api.get("/bitacora", { params });

      const rowsToExport = data.rows || [];

      if (rowsToExport.length === 0) {
        toast({ title: "No hay datos para exportar", status: "warning", duration: 3000 });
        setExporting(false);
        return;
      }

      // 2. Generar PDF
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(14);
      doc.text("Reporte de Bitácora - Extractus", 14, 15);
      doc.setFontSize(10);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 20);

      const tableData = rowsToExport.map(r => {
        let fechaFmt = "—";
        try {
          if (r.fecha) fechaFmt = new Date(r.fecha).toLocaleString();
        } catch (e) { }

        return [
          r.id_bitacora || "—",
          r.usuario || "Desconocido",
          r.tabla || "—",
          r.accion || "—",
          r.descripcion || "—",
          r.ip_origen || "—",
          r.user_agent || "—",
          fechaFmt,
        ];
      });

      doc.autoTable({
        head: [["ID", "Usuario", "Tabla", "Acción", "Descripción", "IP", "User-Agent", "Fecha"]],
        body: tableData,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 120, 170] },
        theme: 'grid'
      });

      doc.save(`Bitacora_Extractus_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "PDF generado correctamente", status: "success", duration: 2500 });

    } catch (err) {
      console.error("Error exportando PDF:", err);
      toast({ title: "Error al generar PDF", description: "Revise la consola para más detalles.", status: "error", duration: 4000 });
    } finally {
      setExporting(false);
    }
  };

  // ============================================================
  // 📊 Exportar a Excel
  // ============================================================
  const exportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Bitácora");

      ws.columns = [
        { header: "ID", key: "id_bitacora", width: 10 },
        { header: "Usuario", key: "usuario", width: 20 },
        { header: "Tabla", key: "tabla", width: 20 },
        { header: "Acción", key: "accion", width: 15 },
        { header: "Descripción", key: "descripcion", width: 40 },
        { header: "IP", key: "ip_origen", width: 15 },
        { header: "User-Agent", key: "user_agent", width: 30 },
        { header: "Fecha", key: "fecha", width: 20 },
      ];

      rows.forEach(r => {
        ws.addRow({
          id_bitacora: r.id_bitacora,
          usuario: r.usuario || "—",
          tabla: r.tabla || "—",
          accion: r.accion || "—",
          descripcion: r.descripcion || "—",
          ip_origen: r.ip_origen || "—",
          user_agent: r.user_agent || "—",
          fecha: new Date(r.fecha).toLocaleString(),
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Bitacora_Extractus.xlsx");
      toast({ title: "Excel generado correctamente", status: "success", duration: 2500 });
    } catch (err) {
      console.error(err);
      toast({ title: "Error al generar Excel", status: "error", duration: 2500 });
    }
  };

  // ============================================================
  // 🎨 Renderizado
  // ============================================================
  return (
    <Box p={6} bg="white" boxShadow="md" borderRadius="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md" color="teal.600">Bitácora del Sistema</Heading>
        <HStack>
          <Button
            leftIcon={<DownloadIcon />}
            colorScheme="blue"
            size="sm"
            onClick={exportPDF}
            isLoading={exporting}
            loadingText="Generando..."
          >
            PDF
          </Button>
          <Button leftIcon={<DownloadIcon />} colorScheme="green" size="sm" onClick={exportExcel}>Excel</Button>
        </HStack>
      </Flex>

      {/* 🔍 Filtros */}
      <Box mb={6} p={4} bg="gray.50" borderRadius="md" borderWidth="1px">
        <Flex direction={{ base: "column", md: "row" }} gap={4} mb={4}>
          <Input
            placeholder="Usuario"
            value={usuario}
            onChange={e => setUsuario(e.target.value)}
            bg="white"
          />
          <Input
            placeholder="Tabla"
            value={tabla}
            onChange={e => setTabla(e.target.value)}
            bg="white"
          />
          <Select
            placeholder="Acción"
            value={accion}
            onChange={e => setAccion(e.target.value)}
            bg="white"
          >
            <option value="INSERT">INSERT</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
          </Select>
        </Flex>
        <Flex direction={{ base: "column", md: "row" }} gap={4} align="center">
          <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} bg="white" />
          <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} bg="white" />
          <Button colorScheme="teal" onClick={handleSearch} minW="100px">Filtrar</Button>
          <Button colorScheme="gray" onClick={handleClear} leftIcon={<RepeatIcon />}>Limpiar</Button>
        </Flex>
      </Box>

      {/* 🧾 Tabla */}
      {loading ? (
        <Flex justify="center" py={10}>
          <Spinner size="xl" color="teal.500" />
        </Flex>
      ) : error ? (
        <Text color="red.400" textAlign="center">{error}</Text>
      ) : (
        <>
          <Box overflowX="auto">
            <Table size="sm" variant="striped" colorScheme="gray">
              <Thead bg="teal.50">
                <Tr>
                  <Th>ID</Th>
                  <Th>Usuario</Th>
                  <Th>Tabla</Th>
                  <Th>Acción</Th>
                  <Th>Descripción</Th>
                  <Th>IP</Th>
                  <Th>User-Agent</Th>
                  <Th>Fecha</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.length === 0 ? (
                  <Tr><Td colSpan={8} textAlign="center" py={4}><Text color="gray.500">No hay registros</Text></Td></Tr>
                ) : (
                  rows.map(r => (
                    <Tr key={r.id_bitacora}>
                      <Td fontWeight="bold">{r.id_bitacora}</Td>
                      <Td>
                        <Badge colorScheme="purple">{r.usuario}</Badge>
                      </Td>
                      <Td>{r.tabla || "-"}</Td>
                      <Td>
                        <Badge
                          colorScheme={
                            r.accion === 'DELETE' ? 'red' :
                              r.accion === 'INSERT' ? 'green' :
                                r.accion === 'UPDATE' ? 'blue' : 'gray'
                          }
                        >
                          {r.accion}
                        </Badge>
                      </Td>
                      <Td maxW="300px" isTruncated title={r.descripcion}>{r.descripcion}</Td>
                      <Td fontSize="xs">{r.ip_origen}</Td>
                      <Td maxW="150px" isTruncated title={r.user_agent} fontSize="xs">{r.user_agent}</Td>
                      <Td fontSize="xs">{new Date(r.fecha).toLocaleString()}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Box>

          {/* Paginación */}
          {rows.length > 0 && (
            <Flex justify="space-between" align="center" mt={4} p={2}>
              <HStack>
                <Text fontSize="sm" color="gray.600">
                  Mostrando {Math.min(rows.length, limit)} de {totalRecords} registros
                </Text>
                <Select
                  size="sm"
                  width="80px"
                  value={limit}
                  onChange={e => setLimit(parseInt(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </Select>
              </HStack>

              <HStack>
                <IconButton
                  icon={<ChevronLeftIcon />}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  isDisabled={page === 1}
                  size="sm"
                  aria-label="Anterior"
                />
                <Text fontSize="sm">Página {page} de {totalPages}</Text>
                <IconButton
                  icon={<ChevronRightIcon />}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  isDisabled={page === totalPages}
                  size="sm"
                  aria-label="Siguiente"
                />
              </HStack>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}
