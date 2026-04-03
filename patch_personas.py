import re

with open('src/components/Seguridad/personas.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject CrudTabla and Stat components imports
import_chakra = re.search(r'import \{([\s\S]*?)\} from "@chakra-ui/react";', content)
if import_chakra:
    chakra_imports = import_chakra.group(1)
    if 'Stat' not in chakra_imports:
        new_chakra_imports = chakra_imports + ",\n  Stat,\n  StatLabel,\n  StatNumber,\n  StatHelpText,\n  Tooltip"
        content = content.replace(chakra_imports, new_chakra_imports)

if "import CrudTabla" not in content:
    content = content.replace('import api from "../../api/apiClient";', 'import api from "../../api/apiClient";\nimport CrudTabla from "./CrudTabla";')

# 2. Add dashboard logic inside Personas()
dashboard_logic = """
  // ✅ Stats Dashboard
  const statsData = {
    total: empleados.length,
    masculinos: empleados.filter(e => (e.genero || "").toLowerCase() === "masculino").length,
    femeninos: empleados.filter(e => (e.genero || "").toLowerCase() === "femenino").length
  };

  // ✅ CRUD Logic para CrudTabla
  const soloLetrasConExtras = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s\-'.]{3,100}$/;
  const dniRegex = /^(\d{13}|\d{4}-\d{4}-\d{5})$/;
  const telefonoRegex = /^[23789]\d{3}-?\d{4}$/;
  const correoRegex = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/;
  const textoSeguro = /^[A-Za-zÁÉÍÓÚáéíóúñÑ0-9 .,#-]{3,255}$/;
  
  const validateText = (v) => (!v || !v.trim()) ? "Obligatorio" : (!soloLetrasConExtras.test(v.trim())) ? "Solo letras, 3 a 100 caracteres" : null;

  const fields = [
    {
      name: "nombre",
      label: "Nombre",
      type: "text",
      validate: validateText,
    },
    {
      name: "apellido",
      label: "Apellido",
      type: "text",
      validate: validateText,
    },
    {
      name: "identificacion",
      label: "Identificación",
      type: "text",
      placeholderText: "Ej: 0000-0000-00000",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!dniRegex.test(v.trim())) ? "Formato inválido" : null,
    },
    {
      name: "fecha_nacimiento",
      label: "Fecha de Nacimiento",
      type: "date",
      validate: (v) => {
         if (!v) return "Requerida";
         const fecha = new Date(v);
         const hoy = new Date();
         if(fecha > hoy) return "Fecha futura no permitida";
         let edad = hoy.getFullYear() - fecha.getFullYear();
         const mesDif = hoy.getMonth() - fecha.getMonth();
         if (mesDif < 0 || (mesDif === 0 && hoy.getDate() < fecha.getDate())) edad--;
         if (edad < 18) return "Debe ser mayor de 18 años";
         return null;
      }
    },
    {
      name: "genero",
      label: "Género",
      type: "select",
      options: [
        { label: "Masculino", value: "Masculino" },
        { label: "Femenino", value: "Femenino" }
      ],
      validate: (v) => (!v) ? "Seleccione género" : null,
    },
    {
      name: "tipo_persona",
      label: "Tipo de Empleado",
      type: "select",
      options: tipos.map(t => ({ label: t.tipo_persona, value: t.id_tipo_persona })),
      validate: (v) => (!v) ? "Seleccione un tipo" : null,
    },
    {
      name: "telefono",
      label: "Teléfono",
      type: "tel",
      placeholderText: "Ocho dígitos ej. 99998888",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!telefonoRegex.test(v.trim())) ? "Inválido (8 dígitos)" : null,
    },
    {
      name: "correo",
      label: "Correo Electrónico",
      type: "email",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!correoRegex.test(v.trim())) ? "Correo incorrecto" : null,
    },
    {
      name: "direccion",
      label: "Dirección Exacta",
      type: "textarea",
      validate: (v) => (!v || !v.trim()) ? "Obligatorio" : (!textoSeguro.test(v.trim())) ? "Tenga cuidado con los caracteres" : null,
    },
    {
      name: "ciudad",
      label: "Ciudad",
      type: "text",
      validate: validateText,
    },
    {
      name: "departamento",
      label: "Departamento",
      type: "text",
      validate: validateText,
    },
    {
      name: "pais",
      label: "País",
      type: "text",
      validate: validateText,
    }
  ];

  const columnsTable = [
    "ID",
    "Nombre Completo",
    "Identidad",
    "Género",
    "Tipo",
    "Teléfono",
    "Correo",
    "Ciudad"
  ];

  const extractors = {
    "ID": (r) => r.id_persona,
    "Nombre Completo": (r) => `${r.nombre || ""} ${r.apellido || ""}`.trim(),
    "Identidad": (r) => r.identificacion,
    "Género": (r) => r.genero || "",
    "Tipo": (r) => r.nombre_tipo_persona,
    "Teléfono": (r) => r.telefono?.numero || "—",
    "Correo": (r) => r.correo?.correo || "—",
    "Ciudad": (r) => r.direccion?.ciudad || "—",
  };

  const handleInsert = async (nuevo) => {
      const res = await api.post("/seguridad/personas", {
        nombre: nuevo.nombre,
        apellido: nuevo.apellido,
        identificacion: nuevo.identificacion,
        fecha_nacimiento: nuevo.fecha_nacimiento,
        genero: nuevo.genero,
        tipo_persona: Number(nuevo.tipo_persona),
      });

      const id = res.data.id_persona;
      await api.post("/seguridad/telefonos", { id_persona: id, numero: nuevo.telefono, id_tipo_telefono: 1 });
      await api.post("/seguridad/correos", { id_persona: id, correo: nuevo.correo });
      await api.post("/seguridad/direcciones", {
        id_persona: id, direccion: nuevo.direccion, ciudad: nuevo.ciudad,
        departamento: nuevo.departamento, pais: nuevo.pais,
      });
      return true;
  };

  const handleUpdate = async (editado) => {
      await api.put(`/seguridad/personas/${editado.id_persona}`, {
        nombre: editado.nombre, apellido: editado.apellido,
        identificacion: editado.identificacion, fecha_nacimiento: editado.fecha_nacimiento,
        genero: editado.genero, tipo_persona: Number(editado.tipo_persona),
      });

      const idTelefonoEdit = editado.telefono?.id_telefono;
      if (idTelefonoEdit) await api.put(`/seguridad/telefonos/${idTelefonoEdit}`, { id_persona: editado.id_persona, numero: editado.telefono, id_tipo_telefono: 1 });
      else if (editado.telefono) await api.post(`/seguridad/telefonos`, { id_persona: editado.id_persona, numero: editado.telefono, id_tipo_telefono: 1 });

      const idCorreoEdit = editado.correo?.id_correo;
      if (idCorreoEdit) await api.put(`/seguridad/correos/${idCorreoEdit}`, { id_persona: editado.id_persona, correo: editado.correo });
      else if (editado.correo) await api.post(`/seguridad/correos`, { id_persona: editado.id_persona, correo: editado.correo });

      const idDireccionEdit = editado.direccion?.id_direccion;
      if (idDireccionEdit) await api.put(`/seguridad/direcciones/${idDireccionEdit}`, {
          id_persona: editado.id_persona, direccion: editado.direccion, ciudad: editado.ciudad, departamento: editado.departamento, pais: editado.pais,
        });
      else if (editado.direccion) await api.post(`/seguridad/direcciones`, {
          id_persona: editado.id_persona, direccion: editado.direccion, ciudad: editado.ciudad, departamento: editado.departamento, pais: editado.pais,
        });
      return true;
  };
"""

content = content.replace("// ============================================================\n  // ✅ Cargar datos\n  // ============================================================", dashboard_logic + "\n  // ============================================================\n  // ✅ Cargar datos\n  // ============================================================")

# 3. Inject missing edit adapter mapping structure into initialData inside CrudTabla
# We'll map the initial data directly. In CrudTabla we pass 'initialData'.
# Wait! CrudTabla uses generic binding, so initialData must have flat keys equal to fields[].name!
# Our table Data is complex (has nested .telefono, .correo Objects). We need to map it!!

flat_mapping_logic = """
  const mappedData = empleados.map(emp => ({
    ...emp,
    fecha_nacimiento: emp.fecha_nacimiento?.split("T")[0] || "",
    telefono: emp.telefono?.numero || "",
    correo: emp.correo?.correo || "",
    direccion: emp.direccion?.direccion || "",
    ciudad: emp.direccion?.ciudad || "",
    departamento: emp.direccion?.departamento || "",
    pais: emp.direccion?.pais || "",
    tipo_persona: emp.tipo_persona || ""
  }));
"""
content = content.replace("return (\n    <Box p={5}>", flat_mapping_logic + "\n  return (\n    <Box p={5}>")


ui_replacement = """<Flex justify="space-between" align="center" mb={3}>
        <Heading size="lg" color={accent}>
          Gestión de Empleados
        </Heading>
        <Button
          size="sm"
          colorScheme="teal"
          leftIcon={<FaFileExport />}
          onClick={() => {
            setExpNombre(""); setExpGenero(""); setExpTipo("");
            setExportFormat("excel");
            setSelectedFields([...ALL_FIELD_KEYS]);
            exportModal.onOpen();
          }}
          isDisabled={exporting}
        >
          Exportar
        </Button>
      </Flex>

      <Divider mb={5} borderColor={borderClr} />

      {/* ✅ DASHBOARD */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color={accent}>Empleados Registrados</StatLabel>
            <StatNumber fontSize="3xl">{statsData.total}</StatNumber>
            <StatHelpText>Personal activo</StatHelpText>
          </Stat>
        </Box>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="green.400">Masculinos</StatLabel>
            <StatNumber fontSize="3xl" color="green.400">{statsData.masculinos}</StatNumber>
          </Stat>
        </Box>
        <Box bg={cardBg} border={`1px solid ${borderClr}`} p={5} rounded="md" shadow="sm">
          <Stat>
            <StatLabel fontSize="lg" color="red.400">Femeninos</StatLabel>
            <StatNumber fontSize="3xl" color="red.400">{statsData.femeninos}</StatNumber>
          </Stat>
        </Box>
      </SimpleGrid>

      {/* ✅ TABLA CRUD */}
      <Box bg={cardBg} p={3} rounded="md" border={`1px solid ${borderClr}`} shadow="sm">
        <CrudTabla
          title="Empleados"
          columns={columnsTable}
          extractors={extractors}
          fields={fields}
          idKey="id_persona"
          initialData={mappedData}
          onInsert={handleInsert}
          onUpdate={handleUpdate}
          onDelete={eliminar}
          onReload={() => cargar()}
          apiUrl="/seguridad/personas"
        />
      </Box>

      {/* 📤 Modal de Exportación */}
      <Modal isOpen={exportModal.isOpen} onClose={exportModal.onClose} isCentered size="lg">"""

# Replace from <Flex gap={5} to the end up to the <Modal ...> export
old_ui_start = content.find('<Flex gap={5} alignItems="flex-start">')
old_ui_end = content.find('{/* === MODAL DE EXPORTACIÓN === */}', old_ui_start)
if old_ui_end == -1:
    old_ui_end = content.find('{/* 📤 Modal de Exportación */}', old_ui_start)

if old_ui_start != -1 and old_ui_end != -1:
    # Also we need to replace the flex spacing
    replace_start = content.rfind('<Flex justify="space-between"', 0, old_ui_start)
    content = content[:replace_start] + ui_replacement + content[old_ui_end + len('{/* 📤 Modal de Exportación */}'):]

# Also remove the whole old validation and internal form code, but let's keep it if we can't safely strip it.
# It's inside the component, replacing it isn't strictly necessary for it to work, but it cleans the code.

with open('src/components/Seguridad/personas.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied.")
