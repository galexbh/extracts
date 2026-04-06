// ============================================================
// Ã°Å¸â€œÂ src/components/Seguridad/CrudTabla.js
// Ã¢Å“â€¦ VersiÃƒÂ³n FINAL con validaciones, placeholders y errores visibles
// ============================================================

import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  IconButton,
  Checkbox,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Text,
  Badge,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { FaPlus, FaSyncAlt } from "react-icons/fa";
import api from "../../api/apiClient";

export default function CrudTabla({
  title,
  apiUrl,
  columns,
  extractors,
  fields,
  idKey,
  initialData = [],
  onReload,
  onInsert,
  onUpdate,
  onDelete,
  formData,
  setFormData,
  customButtons,
  abrirModal = false,
  proveedorBloqueado = null,
  preprocessSave,
  enablePagination = true,
  showReloadButton = true,
  addButtonLabel = "Agregar",
  addButtonProps = {},
}) {
  const toast = useToast();

  const bgContainer = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgFilter = useColorModeValue("gray.100", "gray.700");
  const modalBg = useColorModeValue("white", "gray.800");

  // ============================================================
  // ESTADOS
  // ============================================================
  const [rows, setRows] = useState(initialData || []);
  const [errors, setErrors] = useState({});
  const [filters, setFilters] = useState(
    columns.reduce((a, c) => ({ ...a, [c]: "" }), {})
  );
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sanitizeWarn, setSanitizeWarn] = useState({}); // Ã¢Å¡Â Ã¯Â¸Â aviso de carÃƒÂ¡cter bloqueado

  // Ã°Å¸â€â€ž Sincronizar rows cuando initialData cambia (paginaciÃƒÂ³n, recarga, etc.)
  useEffect(() => {
    setRows(initialData || []);
  }, [initialData]);

  const { isOpen, onOpen, onClose } = useDisclosure();

  // ============================================================
  // BASE VACÃƒÂA
  // ============================================================
  const blankObj = fields.reduce(
    (o, f) => ({
      ...o,
      [f.name]:
        f.type === "boolean"
          ? false
          : f.type === "number"
            ? 0
            : f.type === "date" || f.type === "datetime"
              ? null
              : "",
    }),
    { [idKey]: null }
  );

  const [internalForm, setInternalForm] = useState(blankObj);
  const editing = formData ?? internalForm;
  const setEditing = setFormData ?? setInternalForm;

  // ============================================================
  // ABRIR MODAL AUTOMÃƒÂTICO
  // ============================================================
  useEffect(() => {
    if (abrirModal) {
      if (proveedorBloqueado) {
        setEditing((prev) => ({
          ...prev,
          id_proveedor: proveedorBloqueado.id_proveedor,
        }));
      }
      onOpen();
    }
  }, [abrirModal, proveedorBloqueado, onOpen, setEditing]);

  const handleOnClose = () => {
    setEditing(blankObj);
    setErrors({});
    setSanitizeWarn({});
    onClose();
  };
  const reloadData = async () => {
    try {
      setLoading(true);
      const res = await api.get(apiUrl);
      setRows(res.data || []);
      onReload && onReload();
    } catch (err) {
      console.error("Ã¢ÂÅ’ Error recargando datos:", err);
      toast({ title: "Error recargando datos", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GUARDAR Ã¢â‚¬â€ INCLUYE VALIDACIONES
  // ============================================================
  const handleSave = async () => {
    try {
      let newErrors = {};

      // Ejecutar validaciÃƒÂ³n campo por campo
      fields.forEach((f) => {
        if (f.validate && typeof f.validate === "function") {
          const result = f.validate(editing[f.name], editing);
          if (result) newErrors[f.name] = result;
        }
      });

      setErrors(newErrors);

      // Si hay errores Ã¢â€ â€™ NO guardar
      if (Object.keys(newErrors).length > 0) {
        toast({
          title: "Corrige los campos marcados",
          status: "error",
          duration: 3000,
        });
        return;
      }

      setLoading(true);

      // Ã¢Å“â€¦ Delegar a callbacks del padre si estÃƒÂ¡n definidos
      // Si el callback retorna false, el modal se mantiene abierto (ej: duplicado)
      const isNew = !editing[idKey];
      if (isNew && typeof onInsert === "function") {
        const result = await onInsert(editing);
        if (result !== false) {
          handleOnClose();
          await reloadData();
        }
        return;
      }
      if (!isNew && typeof onUpdate === "function") {
        const result = await onUpdate(editing);
        if (result !== false) {
          handleOnClose();
          await reloadData();
        }
        return;
      }

      // Fallback: llamada directa si no hay callbacks
      const method = editing[idKey] ? "put" : "post";
      const url = editing[idKey] ? `${apiUrl}/${editing[idKey]}` : apiUrl;

      // Ã¢Å“â€¦ Aplicar preprocessSave si estÃƒÂ¡ definido (ej: convertir accesos a JSON string)
      const payload =
        typeof preprocessSave === "function" ? preprocessSave(editing) : editing;

      await api[method](url, payload);
      toast({ title: "Ã¢Å“â€¦ Registro guardado correctamente", status: "success" });
      handleOnClose();
      await reloadData();
    } catch (err) {
      console.error("Ã¢ÂÅ’ Error al guardar:", err);
      toast({
        title: "Error al guardar",
        description: err.response?.data?.error || err.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ELIMINAR
  // ============================================================
  const handleDelete = async () => {
    try {
      if (selectedIds.length === 0) return;
      const selectedRows = rows.filter((row) => selectedIds.includes(row[idKey]));
      const labelColumn = columns[1] || columns[0];
      const selectedNames = selectedRows
        .map((row) => String(extractors[labelColumn]?.(row) ?? row[idKey]))
        .filter(Boolean)
        .slice(0, 3);
      const contextText =
        selectedIds.length === 1
          ? `¿Desea eliminar "${selectedNames[0] || selectedIds[0]}"?`
          : `¿Desea eliminar ${selectedIds.length} registros?\n${selectedNames.join(", ")}${selectedRows.length > 3 ? "..." : ""}`;

      if (!window.confirm(contextText)) return;
      setLoading(true);
      let deletedCount = 0;
      for (const id of selectedIds) {
        if (typeof onDelete === "function") {
          const result = await onDelete(id);
          if (result !== false) deletedCount += 1;
        } else {
          await api.delete(`${apiUrl}/${id}`);
          deletedCount += 1;
        }
      }
      if (deletedCount > 0) {
        toast({
          title: deletedCount === selectedIds.length ? "Registros eliminados" : "Eliminación parcial completada",
          description: deletedCount === selectedIds.length ? undefined : `Se eliminaron ${deletedCount} de ${selectedIds.length} registro(s).`,
          status: deletedCount === selectedIds.length ? "info" : "warning",
        });
      }
      setSelectedIds([]);
      await reloadData();
    } catch (err) {
      console.error("Error al eliminar:", err);
      toast({ title: "Error al eliminar", description: err.response?.data?.error || err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CAMBIO EN CAMPOS Ã¢â‚¬â€ CON VALIDACIÃƒâ€œN EN VIVO
  // ============================================================
  const handleChangeField = (f, rawVal) => {
    let newVal = rawVal?.target ? rawVal.target.value : rawVal;
    const original = newVal;

    // Ã°Å¸Â§Â¹ Filtrar caracteres no permitidos en tiempo real
    if (f.sanitize && typeof f.sanitize === "function") {
      newVal = f.sanitize(newVal);
      if (newVal !== original) {
        setSanitizeWarn((prev) => ({ ...prev, [f.name]: true }));
        setTimeout(() => {
          setSanitizeWarn((prev) => ({ ...prev, [f.name]: false }));
        }, 2500);
      }
    }

    setEditing((prev) => ({ ...prev, [f.name]: newVal }));

    // ValidaciÃƒÂ³n en vivo
    if (f.validate) {
      const errorMsg = f.validate(newVal, editing);
      setErrors((prev) => ({ ...prev, [f.name]: errorMsg }));
    }
  };

  // ============================================================
  // RENDER DE CAMPOS Ã¢â‚¬â€ INPUT, SELECT, TEXTAREA
  // ============================================================
  const renderField = (f) => {
    const value = editing?.[f.name] ?? "";
    const error = errors[f.name];
    const placeholder = f.placeholderText || "";

    let inputField = null;

    switch (f.type) {
      case "custom":
        if (typeof f.render === "function") {
          inputField = f.render(value, (newVal) => handleChangeField(f, newVal));
        } else {
          inputField = <Text color="red.400">Ã¢Å¡Â Ã¯Â¸Â Campo custom sin render()</Text>;
        }
        break;

      case "boolean":
        inputField = (
          <Checkbox
            isChecked={!!value}
            onChange={(e) => handleChangeField(f, e.target.checked)}
            colorScheme="teal"
            size="lg"
            mt={2}
          >
            {f.label}
          </Checkbox>
        );
        break;

      case "select":
        inputField = (
          <Select
            placeholder={placeholder || "Seleccione..."}
            value={value}
            onChange={(e) => handleChangeField(f, e)}
            isInvalid={!!error}
            errorBorderColor="red.500"
          >
            {(f.options || []).map((op, i) => (
              <option key={i} value={op.value}>
                {op.label}
              </option>
            ))}
          </Select>
        );
        break;

      case "textarea":
        inputField = (
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChangeField(f, e)}
            isInvalid={!!error}
            errorBorderColor="red.500"
            maxLength={f.maxLength}
          />
        );
        break;

      default:
        inputField = (
          <Input
            type={f.type || "text"}
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChangeField(f, e)}
            isInvalid={!!error}
            errorBorderColor="red.500"
            maxLength={f.maxLength}
            autoComplete={f.name === "username" || f.name === "password" ? "off" : "default"}
          />
        );
        break;
    }

    // Mensaje: aviso de caracter tiene prioridad sobre error de validaciÃƒÂ³n
    const warnActive = sanitizeWarn[f.name];
    const warnMsg = f.sanitizeWarning || "El campo contiene caracteres no permitidos. Se eliminaron automaticamente.";

    return (
      <>
        {inputField}
        {warnActive ? (
          <Text color="orange.500" fontSize="xs" mt={1} fontWeight="medium">
            {warnMsg}
          </Text>
        ) : error ? (
          <Text color="red.500" fontSize="sm" mt={1}>
            {error}
          </Text>
        ) : null}
        {f.maxLength ? (
          <Text color="gray.500" fontSize="xs" mt={1} textAlign="right">
            {String(value || "").length}/{f.maxLength}
          </Text>
        ) : null}
      </>
    );
  };

  // ============================================================
  // FILTRADO POR BUSQUEDA
  // ============================================================
  const filtered = useMemo(() => {
    return (rows || []).filter((r) =>
      columns.every((c) => {
        const needle = (filters[c] || "").toLowerCase();
        const val = (extractors[c](r) ?? "").toString().toLowerCase();
        return !needle || val.includes(needle);
      })
    );
  }, [rows, filters, columns, extractors]);
  const activeFilterCount = Object.values(filters).filter((value) => String(value || "").trim() !== "").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedRows = useMemo(() => {
    if (!enablePagination) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize, enablePagination]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <>
      {/* Barra superior */}
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap={2} mb={4} wrap="wrap" w="100%">
        <Text fontSize="sm" color="gray.500">
          {selectedIds.length > 0
            ? `${selectedIds.length} registro(s) seleccionado(s)`
            : `${filtered.length} resultado(s)`}
        </Text>
        <Flex
          align="center"
          justify={{ base: "center", md: "flex-end" }}
          gap={2}
          ml="auto"
          w={{ base: "100%", md: "auto" }}
        >
          {selectedIds.length > 0 ? (
            <Menu>
              <MenuButton as={Button} colorScheme="blue" size="sm">
                Acciones
              </MenuButton>
              <MenuList>
                <MenuItem
                  onClick={() => {
                    const row = rows.find((r) => selectedIds.includes(r[idKey]));
                    if (row) {
                      setEditing({ ...blankObj, ...row });
                      onOpen();
                    }
                  }}
                >
                  Editar
                </MenuItem>
                <MenuItem onClick={handleDelete}>Eliminar</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <>
              <Button
                colorScheme="green"
                size="sm"
                onClick={() => {
                  setEditing(blankObj);
                  setErrors({});
                  onOpen();
                }}
                leftIcon={<FaPlus />}
                justifyContent="center"
                alignItems="center"
                minW="160px"
                {...addButtonProps}
              >
                {addButtonLabel}
              </Button>
              {showReloadButton && (
                <IconButton
                  colorScheme="gray"
                  size="sm"
                  aria-label="Recargar"
                  icon={<FaSyncAlt />}
                  onClick={reloadData}
                  isLoading={loading}
                />
              )}
            </>
          )}
        </Flex>
      </Flex>

      {/* Tabla */}
      <Box
        mt={2}
        p={4}
        w="100%"
        maxW="100%"
        bg={bgContainer}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
      >
        {/* Filtros */}
        <Flex wrap="wrap" gap={2} mb={4} w="100%">
          {columns.map((col) => (
            <FormControl key={col} flex="1 1 180px" minW={{ base: "100%", md: "180px" }}>
              <Input
                name={col}
                value={filters[col]}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, [col]: e.target.value }))
                }
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
        <Flex justify="space-between" align="center" mb={3} wrap="wrap" gap={2}>
          <Text fontSize="xs" color="gray.500">
            {activeFilterCount === 0
              ? "Sin filtros aplicados. Se muestran todos los registros."
              : `Filtros activos: ${activeFilterCount}`}
          </Text>
          {activeFilterCount > 0 && (
            <Badge colorScheme="teal" borderRadius="full" px={2}>
              Búsqueda filtrada
            </Badge>
          )}
        </Flex>

        {/* Tabla */}
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={
                      paginatedRows.length > 0 &&
                      paginatedRows.every((r) => selectedIds.includes(r[idKey]))
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? Array.from(new Set([...selectedIds, ...paginatedRows.map((r) => r[idKey])]))
                          : selectedIds.filter((id) => !paginatedRows.some((r) => r[idKey] === id))
                      )
                    }
                  />
                </Th>
                {columns.map((c) => (
                  <Th key={c}>{c}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {paginatedRows.length === 0 && (
                <Tr>
                  <Td colSpan={columns.length + 1}>
                    <Text py={6} textAlign="center" color="gray.500">
                      No hay registros que coincidan con los filtros actuales.
                    </Text>
                  </Td>
                </Tr>
              )}
              {paginatedRows.map((r) => (
                <Tr key={r[idKey]}>
                  <Td>
                    <Checkbox
                      isChecked={selectedIds.includes(r[idKey])}
                      onChange={(e) =>
                        setSelectedIds((sel) =>
                          e.target.checked
                            ? [...sel, r[idKey]]
                            : sel.filter((x) => x !== r[idKey])
                        )
                      }
                    />
                  </Td>
                  {columns.map((c, i) => (
                    <Td
                      key={c}
                      cursor={i === 0 ? "pointer" : "default"}
                      onClick={
                        i === 0
                          ? () => {
                            setEditing({ ...blankObj, ...r });
                            onOpen();
                          }
                          : undefined
                      }
                    >
                      {extractors[c](r)}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {enablePagination && (
        <Flex justify="space-between" align="center" mt={4} gap={3} wrap="wrap">
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.500">
              PÃƒÂ¡gina {currentPage} de {totalPages}
            </Text>
            <Select
              size="sm"
              width="90px"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </Select>
          </Flex>

          <Flex gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              isDisabled={currentPage === 1}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              isDisabled={currentPage === totalPages}
            >
              Siguiente
            </Button>
          </Flex>
        </Flex>
        )}
      </Box>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={handleOnClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent mx="auto" w={{ base: "90%", md: "600px" }} bg={modalBg}>
          <ModalHeader>
            <Flex direction="column" gap={1}>
              <Text>{editing[idKey] ? "Editar" : "Agregar"}</Text>
              {editing[idKey] && (
                <Text fontSize="sm" fontWeight="normal" color="gray.500">
                  Registro cargado para edición: {String(editing[fields[0]?.name] || editing[idKey])}
                </Text>
              )}
            </Flex>
          </ModalHeader>

          <ModalBody maxH="70vh" overflowY="auto">
            {fields
              .filter((f) => {
                const isEditing = !!editing[idKey];
                if (isEditing && f.showOnEdit === false) return false;
                if (!isEditing && f.showOnCreate === false) return false;
                return true;
              })
              .map((f) => (
                <FormControl key={f.name} mt={3} isInvalid={!!errors[f.name]}>
                  {f.type !== "boolean" && <FormLabel mb={1}>{f.label}</FormLabel>}
                  {renderField(f)}
                </FormControl>
              ))}
          </ModalBody>

          <ModalFooter>
            {typeof customButtons === "function" ? (
              customButtons(editing, handleOnClose, handleSave)
            ) : (
              <>
                <Button colorScheme="green" onClick={handleSave} isLoading={loading}>
                  Guardar
                </Button>
                <Button variant="ghost" ml={3} onClick={handleOnClose}>
                  Cancelar
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
