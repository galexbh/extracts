// ============================================================
// 📁 src/components/Seguridad/personas.js
// ✅ Versión FINAL — Modo Claro/Oscuro optimizado
// ✅ Sin errores de ESLint ni reglas de hooks
// ============================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Flex,
  Heading,
  Divider,
  Spinner,
  useToast,
  useColorModeValue,
  Button,
  Grid,
  FormControl,
  FormLabel,
  Input,
  Select,
} from "@chakra-ui/react";

import {
  FaSave,
  FaTrash,
  FaEdit,
  FaBroom,
  FaArrowLeft,
} from "react-icons/fa";

import { useNavigate } from "react-router-dom";
import api from "../../api/apiClient";

export default function Personas() {
  const toast = useToast();
  const navigate = useNavigate();

  // ============================================================
  // ✅ PALETA HÍBRIDA (definida UNA VEZ)
  // ============================================================
  const cardBg = useColorModeValue("#FFFFFF", "#1E293B");
  const borderClr = useColorModeValue("#E2E8F0", "#334155");
  const accent = useColorModeValue("#0D9488", "#2DD4BF");

  const rowBgEven = useColorModeValue("#F8FAFC", "#1F2937");
  const rowBgOdd = useColorModeValue("#FFFFFF", "#111827");

  const inputBg = useColorModeValue("#F1F5F9", "#1E293B");
  const inputBorder = useColorModeValue("#CBD5E1", "#475569");
  const inputText = useColorModeValue("#0F172A", "#F8FAFC");

  const tableHeadBg = useColorModeValue("#0D9488", "#0F766E");
  const tableHeadText = useColorModeValue("#FFFFFF", "#E2E8F0");

  const colorBtn = useColorModeValue("#0D9488", "#0D9488");
  const colorBtnHover = useColorModeValue("#0FAD9B", "#14B8A6");
  const dangerBtn = useColorModeValue("#DC2626", "#DC2626");
  const dangerBtnHover = useColorModeValue("#EF4444", "#B91C1C");

  // ============================================================
  // ✅ Estados
  // ============================================================
  const [empleados, setEmpleados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modoEdicion, setModoEdicion] = useState(false);

  const [idPersonaEdit, setIdPersonaEdit] = useState(null);
  const [idTelefonoEdit, setIdTelefonoEdit] = useState(null);
  const [idCorreoEdit, setIdCorreoEdit] = useState(null);
  const [idDireccionEdit, setIdDireccionEdit] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    identificacion: "",
    fecha_nacimiento: "",
    genero: "",
    tipo_persona: "",
    telefono: "",
    correo: "",
    direccion: "",
    ciudad: "",
    departamento: "",
    pais: "",
  });

  //aqui poner codigo de las validaciones ----------------------------------------------------

  // ============================================================
  // VALIDACIONES (Mejoradas)
  // ============================================================
  const validarFormulario = () => {
    // Expresión para letras, tildes, ñ, Ñ, espacios y guiones/puntos (para nombres compuestos)
    const soloLetrasConExtras = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s\-'.]{3,100}$/;
    const dniRegex = /^(\d{13}|\d{4}-\d{4}-\d{5})$/;
    // ✅ Acepta número sin guion (99999999) O con guion (9999-9999)
    const telefonoRegex = /^[23789]\d{3}-?\d{4}$/;
    const correoRegex = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/;
    // Texto seguro para direcciones: letras, números, espacios, puntos, comas, guiones, almohadillas
    const textoSeguro = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,#-]{3,255}$/;

    // Helper corregido: se asegura que el valor sea una cadena ANTES de usar .trim()
    const esVacio = (valor) => !valor || (typeof valor === 'string' && valor.trim() === "");

    // ----------------------------------------------------
    // Nombre y Apellido (varchar 100, NOT NULL)
    // ----------------------------------------------------
    if (esVacio(form.nombre)) {
      toast({ title: "El Nombre es obligatorio", status: "warning" });
      return false;
    }
    if (!soloLetrasConExtras.test(form.nombre.trim())) {
      toast({
        title: "Nombre inválido",
        description: "Solo letras, mínimo 3 y máximo 100 caracteres.",
        status: "warning",
      });
      return false;
    }

    if (esVacio(form.apellido)) {
      toast({ title: "El Apellido es obligatorio", status: "warning" });
      return false;
    }
    if (!soloLetrasConExtras.test(form.apellido.trim())) {
      toast({
        title: "Apellido inválido",
        description: "Solo letras, mínimo 3 y máximo 100 caracteres.",
        status: "warning",
      });
      return false;
    }

    // ----------------------------------------------------
    // Identificación (varchar 50, Opcional en BD, Requerido en Formulario)
    // ----------------------------------------------------
    if (esVacio(form.identificacion)) {
      toast({ title: "La Identificación es requerida", status: "warning" });
      return false;
    }
    if (form.identificacion.trim().length > 50) {
      toast({ title: "Identificación inválida", description: "No puede exceder 50 caracteres (BD).", status: "warning" });
      return false;
    }
    // Mantengo la RegEx específica del usuario si es por formato local
    if (!dniRegex.test(form.identificacion.trim())) {
      toast({
        title: "Identificación inválida",
        description: "Debe ser 13 dígitos o formato 0000-0000-00000.",
        status: "warning",
      });
      return false;
    }

    // ----------------------------------------------------
    // Fecha nacimiento (date, Opcional en BD, Requerido en Formulario)
    // ----------------------------------------------------
    if (!form.fecha_nacimiento) {
      toast({ title: "Fecha de nacimiento requerida", status: "warning" });
      return false;
    }
    const fecha = new Date(form.fecha_nacimiento);
    const hoy = new Date();
    if (isNaN(fecha)) {
      toast({ title: "Fecha inválida", description: "Verifique el formato de la fecha.", status: "warning" });
      return false;
    }
    if (fecha > hoy) {
      toast({ title: "Fecha inválida", description: "No puede ser futura.", status: "warning" });
      return false;
    }
    // ✅ Cálculo exacto: verificar si el cumpleaños ya pasó este año
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const mesDif = hoy.getMonth() - fecha.getMonth();
    if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fecha.getDate())) {
      edad--; // El cumpleaños aún no ha pasado este año
    }
    if (edad < 18) {
      toast({ title: "Edad mínima: 18 años", status: "warning" });
      return false;
    }

    // ----------------------------------------------------
    // Género (varchar 20, Opcional en BD, Requerido en Formulario)
    // ----------------------------------------------------
    if (esVacio(form.genero)) {
      toast({ title: "Seleccione un género", status: "warning" });
      return false;
    }
    // Se asume que el Select limita la longitud a 20 (DB)

    // ----------------------------------------------------
    // Tipo empleado (Tipo persona, integer, NOT NULL)
    // ----------------------------------------------------
    if (esVacio(form.tipo_persona)) {
      toast({ title: "Seleccione un tipo de empleado", status: "warning" });
      return false;
    }
    // La FK en el Back-end se encargará de validar si el ID existe (Integridad Referencial).

    // ----------------------------------------------------
    // Teléfono
    // ----------------------------------------------------
    if (esVacio(form.telefono)) {
      toast({ title: "El Teléfono es requerido", status: "warning" });
      return false;
    }
    if (!telefonoRegex.test(form.telefono.trim())) {
      toast({
        title: "Teléfono inválido",
        description: "Debe tener 8 dígitos y comenzar con 2,3,7,8 o 9.",
        status: "warning",
      });
      return false;
    }

    // ----------------------------------------------------
    // Correo
    // ----------------------------------------------------
    if (esVacio(form.correo)) {
      toast({ title: "El Correo es requerido", status: "warning" });
      return false;
    }
    if (!correoRegex.test(form.correo.trim())) {
      toast({ title: "Correo inválido", status: "warning" });
      return false;
    }

    // ----------------------------------------------------
    // Dirección
    // ----------------------------------------------------
    if (esVacio(form.direccion)) {
      toast({ title: "La Dirección es requerida", status: "warning" });
      return false;
    }
    if (!textoSeguro.test(form.direccion.trim())) {
      toast({ title: "Dirección inválida", description: "Mínimo 3, máximo 255 caracteres permitidos.", status: "warning" });
      return false;
    }

    // ----------------------------------------------------
    // Ciudad, Departamento, País
    // ----------------------------------------------------
    // Se recomienda usar el RegEx 'soloLetrasConExtras' también para estos campos
    const validacionDireccion = (field, label) => {
      if (esVacio(form[field])) {
        toast({ title: `${label} es obligatorio`, status: "warning" });
        return false;
      }
      if (!soloLetrasConExtras.test(form[field].trim())) {
        toast({ title: `${label} inválido`, status: "warning" });
        return false;
      }
      return true;
    };

    if (!validacionDireccion('ciudad', 'Ciudad')) return false;
    if (!validacionDireccion('departamento', 'Departamento')) return false;
    if (!validacionDireccion('pais', 'País')) return false;

    return true;
  };


  // ============================================================
  // ✅ Cargar datos
  // ============================================================
  const cargar = useCallback(async () => {
    try {
      const [p, t, phones, mails, dirs] = await Promise.all([
        api.get("/seguridad/personas"),
        api.get("/mantenimiento/tipo-persona"),
        api.get("/seguridad/telefonos"),
        api.get("/seguridad/correos"),
        api.get("/seguridad/direcciones"),
      ]);

      const tabla = p.data.map((emp) => ({
        ...emp,
        telefono: phones.data.find((x) => x.id_persona === emp.id_persona),
        correo: mails.data.find((x) => x.id_persona === emp.id_persona),
        direccion: dirs.data.find((x) => x.id_persona === emp.id_persona),
      }));

      setEmpleados(tabla);
      setTipos(t.data);
    } catch (error) {
      toast({
        title: "Error cargando empleados",
        description: error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ============================================================
  // ✅ Form handlers
  // ============================================================
  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const limpiar = () => {
    setModoEdicion(false);
    setIdPersonaEdit(null);
    setIdTelefonoEdit(null);
    setIdCorreoEdit(null);
    setIdDireccionEdit(null);

    setForm({
      nombre: "",
      apellido: "",
      identificacion: "",
      fecha_nacimiento: "",
      genero: "",
      tipo_persona: "",
      telefono: "",
      correo: "",
      direccion: "",
      ciudad: "",
      departamento: "",
      pais: "",
    });
  };

  // ============================================================
  // ✅ Editar (CORREGIDO)
  // ============================================================
  const editar = (emp) => {
    setModoEdicion(true);

    setIdPersonaEdit(emp.id_persona);
    setIdTelefonoEdit(emp.telefono?.id_telefono || null);
    setIdCorreoEdit(emp.correo?.id_correo || null);
    setIdDireccionEdit(emp.direccion?.id_direccion || null);

    setForm({
      // Campos que siempre existen en la persona: usar || "" si no son seguros
      nombre: emp.nombre || "",
      apellido: emp.apellido || "",
      identificacion: emp.identificacion || "", // 👈 ASEGURAR SI ES OPCIONAL EN BD
      fecha_nacimiento: emp.fecha_nacimiento?.split("T")[0] || "",
      genero: emp.genero || "",
      tipo_persona: emp.tipo_persona || "", // Usar string vacío para el Select si es nulo

      // Campos de tablas relacionadas (teléfono, correo, dirección):
      // Ya usas el encadenamiento opcional (?.) seguido de || ""
      telefono: emp.telefono?.numero || "",
      correo: emp.correo?.correo || "",
      direccion: emp.direccion?.direccion || "",
      ciudad: emp.direccion?.ciudad || "",
      departamento: emp.direccion?.departamento || "",
      pais: emp.direccion?.pais || "",
    });
  };

  // ============================================================
  // ✅ Guardar nuevo (MODIFICADO)
  // ============================================================
  const guardarNuevo = async () => {
    // 👈 PRIMER PASO: Llamar a la validación
    if (!validarFormulario()) {
      return; // Si la validación falla, detiene la función y el Toast se mostró dentro de validarFormulario
    }

    try {
      // El resto de tu lógica de envío (solo si es válido)
      const res = await api.post("/seguridad/personas", {
        nombre: form.nombre,
        apellido: form.apellido,
        identificacion: form.identificacion,
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero,
        tipo_persona: Number(form.tipo_persona),
      });

      const id = res.data.id_persona;

      await api.post("/seguridad/telefonos", {
        id_persona: id,
        numero: form.telefono,
        id_tipo_telefono: 1,
      });

      await api.post("/seguridad/correos", {
        id_persona: id,
        correo: form.correo,
      });

      await api.post("/seguridad/direcciones", {
        id_persona: id,
        direccion: form.direccion,
        ciudad: form.ciudad,
        departamento: form.departamento,
        pais: form.pais,
      });

      toast({ title: "✅ Empleado creado", status: "success" });
      limpiar();
      cargar();
    } catch (e) {
      toast({ title: "Error", description: e.message, status: "error" });
    }
  };

  // ============================================================
  // ✅ Actualizar empleado (MODIFICADO)
  // ============================================================
  const actualizar = async () => {
    // 👈 PRIMER PASO: Llamar a la validación
    if (!validarFormulario()) {
      return; // 🛑 Si la validación falla, detiene la función.
    }

    try {
      // El resto de tu lógica de envío (solo si es válido)
      await api.put(`/seguridad/personas/${idPersonaEdit}`, {
        nombre: form.nombre,
        apellido: form.apellido,
        identificacion: form.identificacion,
        fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero,
        tipo_persona: Number(form.tipo_persona),
      });

      if (idTelefonoEdit)
        await api.put(`/seguridad/telefonos/${idTelefonoEdit}`, {
          id_persona: idPersonaEdit,
          numero: form.telefono,
          id_tipo_telefono: 1,
        });
      else if (form.telefono)
        await api.post(`/seguridad/telefonos`, {
          id_persona: idPersonaEdit,
          numero: form.telefono,
          id_tipo_telefono: 1,
        });

      if (idCorreoEdit)
        await api.put(`/seguridad/correos/${idCorreoEdit}`, {
          id_persona: idPersonaEdit,
          correo: form.correo,
        });
      else if (form.correo)
        await api.post(`/seguridad/correos`, {
          id_persona: idPersonaEdit,
          correo: form.correo,
        });

      if (idDireccionEdit)
        await api.put(`/seguridad/direcciones/${idDireccionEdit}`, {
          id_persona: idPersonaEdit,
          direccion: form.direccion,
          ciudad: form.ciudad,
          departamento: form.departamento,
          pais: form.pais,
        });
      else if (form.direccion)
        await api.post(`/seguridad/direcciones`, {
          id_persona: idPersonaEdit,
          direccion: form.direccion,
          ciudad: form.ciudad,
          departamento: form.departamento,
          pais: form.pais,
        });

      toast({ title: "✅ Empleado actualizado", status: "success" });
      limpiar();
      cargar();
    } catch (e) {
      toast({
        title: "Error al actualizar",
        description: e.message,
        status: "error",
      });
    }
  };

  // ============================================================
  // ✅ Eliminar
  // ============================================================
  const eliminar = async (id) => {
    try {
      await api.delete(`/seguridad/personas/${id}`);
      toast({ title: "🗑️ Empleado eliminado", status: "success" });
      cargar();
    } catch (e) {
      toast({
        title: "Error al eliminar",
        description: e.response?.data?.error || e.message,
        status: "error",
      });
    }
  };

  // ============================================================
  // ✅ Loading
  // ============================================================
  if (loading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="xl" color={accent} />
      </Flex>
    );
  }

  // ============================================================
  // ✅ UI FINAL SIN ERRORES DE HOOKS
  // ============================================================
  return (
    <Box p={5}>

      {/* ✅ Botón Atrás */}
      <Button
        leftIcon={<FaArrowLeft />}
        bg={colorBtn}
        color="white"
        _hover={{ bg: colorBtnHover }}
        size="sm"
        mb={4}
        onClick={() => navigate("/app/seguridad")}
      >
        Atrás
      </Button>

      <Heading size="lg" color={accent} mb={3}>
        Gestión de Empleados
      </Heading>

      <Divider mb={5} borderColor={borderClr} />

      <Flex gap={5} alignItems="flex-start">

        {/* ======================================================
            ✅ FORMULARIO IZQUIERDO
        ====================================================== */}
        <Box
          width="320px"
          bg={cardBg}
          shadow="md"
          rounded="md"
          p={4}
          maxHeight="75vh"
          overflowY="auto"
          border={`1px solid ${borderClr}`}
          fontSize="14px"
        >
          <Heading size="md" mb={3} color={accent}>
            {modoEdicion ? "Editar empleado" : "Nuevo empleado"}
          </Heading>

          <Grid templateColumns="1fr" gap={3}>
            {[ //Todas estas linesa las modifique
              ["Nombre", "nombre", "text", "Ingrese el nombre del empleado"],
              ["Apellido", "apellido", "text", "Ingrese el apellido del empleado"],
              ["Identificación", "identificacion", "text", "Formato: 0000-0000-00000 o 13 dígitos"],
              ["Fecha nacimiento", "fecha_nacimiento", "date", "Mayor de 18 años"],
              ["Teléfono", "telefono", "tel", "Formato: 99999999 (8 dígitos)"],
              ["Correo", "correo", "email", "Ejemplo: correo@dominio.com"],
              ["Dirección", "direccion", "text", "Ingrese dirección completa"],
              ["Ciudad", "ciudad", "text", "Ingrese la ciudad"],
              ["Departamento", "departamento", "text", "Ingrese el departamento"],
              ["País", "pais", "text", "Ingrese el país"],
            ].map(([label, name, type, placeholderText]) => ( //aqui añadi placeholderText
              <FormControl key={name}>
                <FormLabel fontSize="13px" color={inputText}>
                  {label}
                </FormLabel>
                <Input
                  type={type || "text"}
                  name={name}
                  size="sm"
                  value={form[name]}
                  onChange={change}
                  placeholder={placeholderText} //nueva linea placeholderText
                  bg={inputBg}
                  borderColor={inputBorder}
                  color={inputText}
                  _focus={{
                    borderColor: "#0D9488",
                    boxShadow: "0 0 0 1px #0D9488",
                  }}
                />
              </FormControl>
            ))}

            <FormControl>
              <FormLabel fontSize="13px" color={inputText}>
                Género
              </FormLabel>
              <Select
                name="genero"
                size="sm"
                value={form.genero}
                onChange={change}
                bg={inputBg}
                borderColor={inputBorder}
                color={inputText}
                _focus={{
                  borderColor: "#0D9488",
                  boxShadow: "0 0 0 1px #0D9488",
                }}
              >
                <option value="">Seleccione</option>
                <option value="Femenino">Femenino</option>
                <option value="Masculino">Masculino</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="13px" color={inputText}>
                Tipo empleado
              </FormLabel>
              <Select
                name="tipo_persona"
                size="sm"
                value={form.tipo_persona}
                onChange={change}
                bg={inputBg}
                borderColor={inputBorder}
                color={inputText}
                _focus={{
                  borderColor: "#0D9488",
                  boxShadow: "0 0 0 1px #0D9488",
                }}
              >
                <option value="">Seleccione</option>
                {tipos.map((t) => (
                  <option value={t.id_tipo_persona} key={t.id_tipo_persona}>
                    {t.nombre_tipo}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Flex mt={4} gap={3}>
            <Button
              leftIcon={<FaSave />}
              bg={colorBtn}
              color="white"
              width="full"
              size="sm"
              _hover={{ bg: colorBtnHover }}
              onClick={modoEdicion ? actualizar : guardarNuevo}
            >
              {modoEdicion ? "Actualizar" : "Guardar"}
            </Button>

            <Button
              leftIcon={<FaBroom />}
              colorScheme="gray"
              width="full"
              size="sm"
              onClick={limpiar}
            >
              Limpiar
            </Button>
          </Flex>
        </Box>

        {/* ======================================================
            ✅ TABLA DERECHA
        ====================================================== */}
        <Box
          flex="1"
          bg={cardBg}
          shadow="md"
          rounded="md"
          p={4}
          maxHeight="75vh"
          overflowY="auto"
          border={`1px solid ${borderClr}`}
          fontSize="14px"
        >
          <Box
            display="inline-block"
            bg={colorBtn}
            color="white"
            px={4}
            py={2}
            mb={4}
            rounded="full"
            fontSize="sm"
            fontWeight="bold"
            shadow="md"
          >
            {empleados.length} empleados
          </Box>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              color: inputText,
            }}
          >
            <thead
              style={{
                background: tableHeadBg,
                color: tableHeadText,
              }}
            >
              <tr>
                {[
                  "ID",
                  "Nombre",
                  "Identificación",
                  "Género",
                  "Tipo",
                  "Teléfono",
                  "Correo",
                  "Ciudad",
                  "Acciones",
                ].map((h) => (
                  <th key={h} style={{ padding: "8px", textAlign: "center" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {empleados.map((emp, i) => (
                <tr
                  key={emp.id_persona}
                  style={{
                    background: i % 2 === 0 ? rowBgEven : rowBgOdd,
                    textAlign: "center",
                  }}
                >
                  <td>{emp.id_persona}</td>
                  <td>{emp.nombre} {emp.apellido}</td>
                  <td>{emp.identificacion}</td>
                  <td>{emp.genero}</td>
                  <td>{emp.nombre_tipo_persona}</td>
                  <td>{emp.telefono?.numero || ""}</td>
                  <td>{emp.correo?.correo || ""}</td>
                  <td>{emp.direccion?.ciudad || ""}</td>

                  <td>
                    <Button
                      size="xs"
                      bg={colorBtn}
                      color="white"
                      _hover={{ bg: colorBtnHover }}
                      mr={2}
                      p={1}
                      onClick={() => editar(emp)}
                    >
                      <FaEdit size={12} />
                    </Button>

                    <Button
                      size="xs"
                      bg={dangerBtn}
                      color="white"
                      _hover={{ bg: dangerBtnHover }}
                      p={1}
                      onClick={() => eliminar(emp.id_persona)}
                    >
                      <FaTrash size={12} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Flex>
    </Box>
  );
}
