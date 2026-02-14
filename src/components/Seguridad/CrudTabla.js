// ============================================================
// 📁 src/components/Seguridad/CrudTabla.js
// ✅ Versión FINAL con validaciones, placeholders y errores visibles
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
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { FaSyncAlt } from "react-icons/fa";
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
  formData,
  setFormData,
  customButtons,
  abrirModal = false,
  proveedorBloqueado = null,
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

  const { isOpen, onOpen, onClose } = useDisclosure();

  // ============================================================
  // BASE VACÍA
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
  // ABRIR MODAL AUTOMÁTICO
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

  // ============================================================
  // RECARGAR DATOS
  // ============================================================
  const reloadData = async () => {
    try {
      setLoading(true);
      const res = await api.get(apiUrl);
      setRows(res.data || []);
      onReload && onReload();
    } catch (err) {
      console.error("❌ Error recargando datos:", err);
      toast({ title: "Error recargando datos", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GUARDAR — INCLUYE VALIDACIONES
  // ============================================================
  const handleSave = async () => {
    try {
      let newErrors = {};

      // Ejecutar validación campo por campo
      fields.forEach((f) => {
        if (f.validate && typeof f.validate === "function") {
          const result = f.validate(editing[f.name], editing);
          if (result) newErrors[f.name] = result;
        }
      });

      setErrors(newErrors);

      // Si hay errores → NO guardar
      if (Object.keys(newErrors).length > 0) {
        toast({
          title: "Corrige los campos marcados",
          status: "error",
          duration: 3000,
        });
        return;
      }

      setLoading(true);

      const method = editing[idKey] ? "put" : "post";
      const url = editing[idKey] ? `${apiUrl}/${editing[idKey]}` : apiUrl;

      await api[method](url, editing);
      toast({ title: "✅ Registro guardado correctamente", status: "success" });
      onClose();
      await reloadData();
    } catch (err) {
      console.error("❌ Error al guardar:", err);
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
      setLoading(true);
      for (const id of selectedIds) {
        await api.delete(`${apiUrl}/${id}`);
      }
      toast({ title: "🗑️ Registro(s) eliminado(s)", status: "info" });
      setSelectedIds([]);
      await reloadData();
    } catch (err) {
      console.error("❌ Error al eliminar:", err);
      toast({ title: "Error al eliminar", status: "error" });
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CAMBIO EN CAMPOS — CON VALIDACIÓN EN VIVO
  // ============================================================
  const handleChangeField = (f, rawVal) => {
    const newVal = rawVal?.target ? rawVal.target.value : rawVal;

    setEditing((prev) => ({ ...prev, [f.name]: newVal }));

    // Validación en vivo
    if (f.validate) {
      const errorMsg = f.validate(newVal, editing);
      setErrors((prev) => ({ ...prev, [f.name]: errorMsg }));
    }
  };

  // ============================================================
  // RENDER DE CAMPOS — INPUT, SELECT, TEXTAREA
  // ============================================================
  const renderField = (f) => {
    const value = editing?.[f.name] ?? "";
    const error = errors[f.name];
    const placeholder = f.placeholderText || "";

    let inputField = null;

    switch (f.type) {
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
          />
        );
        break;
    }

    return (
      <>
        {inputField}
        {error && (
          <Text color="red.500" fontSize="sm" mt={1}>
            {error}
          </Text>
        )}
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

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <>
      {/* Barra superior */}
      <Flex justify="flex-end" gap={2} mb={4} mx={8}>
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
            <Button colorScheme="green" size="sm" onClick={onOpen}>
              + Agregar
            </Button>
            <IconButton
              colorScheme="gray"
              size="sm"
              aria-label="Recargar"
              icon={<FaSyncAlt />}
              onClick={reloadData}
              isLoading={loading}
            />
          </>
        )}
      </Flex>

      {/* Tabla */}
      <Box
        mt={2}
        p={4}
        mx={8}
        bg={bgContainer}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        boxShadow="lg"
      >
        {/* Filtros */}
        <Flex wrap="wrap" gap={2} mb={4}>
          {columns.map((col) => (
            <FormControl key={col} w="auto">
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

        {/* Tabla */}
        <Box overflowX="auto">
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>
                  <Checkbox
                    isChecked={
                      selectedIds.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? filtered.map((r) => r[idKey])
                          : []
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
              {filtered.map((r) => (
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
      </Box>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent mx="auto" w={{ base: "90%", md: "600px" }} bg={modalBg}>
          <ModalHeader>{editing[idKey] ? "Editar" : "Agregar"}</ModalHeader>

          <ModalBody>
            {fields.map((f) => (
              <FormControl key={f.name} mt={3}>
                {f.type !== "boolean" && <FormLabel mb={1}>{f.label}</FormLabel>}
                {renderField(f)}
              </FormControl>
            ))}
          </ModalBody>

          <ModalFooter>
            {typeof customButtons === "function" ? (
              customButtons(editing, onClose, handleSave)
            ) : (
              <>
                <Button colorScheme="green" onClick={handleSave} isLoading={loading}>
                  Guardar
                </Button>
                <Button variant="ghost" ml={3} onClick={onClose}>
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
