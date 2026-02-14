// src/components/Seguridad/cambiarcontrasena.js
import React, { useMemo, useState } from "react";
import {
  Box, Flex, Heading, Divider, Button, FormControl, FormLabel,
  Input, InputGroup, InputRightElement, IconButton, Text, Progress,
  List, ListItem, ListIcon, useColorModeValue, useToast,
} from "@chakra-ui/react";
import { ViewIcon, ViewOffIcon, CheckCircleIcon, WarningIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";

/** =====================================
 * Configura aquí tu backend (o simulación)
 * ===================================== */
const API_URL = "/api/auth/change-password"; // ⚠️ Cambia esto a tu endpoint real
const useBackend = false; // ⬅️ ponlo en true cuando tengas backend
const FAKE_DELAY_MS = 900;

// Ejemplo de obtención de token/usuario (ajústalo a tu auth real)
const getAuthContext = () => ({
  userId: 1,                        // id del usuario logueado
  token: localStorage.getItem("token") || "", // bearer token si usas JWT
});

// Llama al backend o simula una respuesta OK
async function changePassword({ currentPassword, newPassword }) {
  const { userId, token } = getAuthContext();

  if (!useBackend) {
    // Simulación: “verifica” que la actual no sea "wrong"
    await new Promise((r) => setTimeout(r, FAKE_DELAY_MS));
    if (currentPassword === "wrong") {
      const err = new Error("Contraseña actual incorrecta");
      err.status = 401;
      throw err;
    }
    return { ok: true };
  }

  // Llamada real
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      userId,                // o envía en el token, según tu API
      currentPassword,
      newPassword,
    }),
    credentials: "include", // si usas cookies/sesión
  });

  if (!res.ok) {
    const data = await safeJson(res);
    const msg = data?.message || `Error ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return await safeJson(res);
}

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

/** ============================
 * Reglas de contraseña (param.)
 * ============================ */
const PASSWORD_RULES = {
  minLen: 8,
  requireUpper: true,
  requireLower: true,
  requireNumber: true,
  requireSymbol: true,
};

const scorePassword = (pwd) => {
  if (!pwd) return 0;
  let s = 0;
  if (pwd.length >= PASSWORD_RULES.minLen) s++;
  if (PASSWORD_RULES.requireUpper && /[A-Z]/.test(pwd)) s++;
  if (PASSWORD_RULES.requireLower && /[a-z]/.test(pwd)) s++;
  if (PASSWORD_RULES.requireNumber && /\d/.test(pwd)) s++;
  if (PASSWORD_RULES.requireSymbol && /[^A-Za-z0-9]/.test(pwd)) s++;
  return s; // 0..5
};

export default function CambiarContrasena() {
  const navigate = useNavigate();
  const toast = useToast();

  const cardBg = useColorModeValue("white", "gray.800");
  const border = useColorModeValue("gray.200", "gray.700");
  const accent = useColorModeValue("teal.600", "teal.300");
  const muted = useColorModeValue("gray.600", "gray.300");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const strength = useMemo(() => scorePassword(form.next), [form.next]);
  const strengthPct = (strength / 5) * 100;
  const strengthLabel =
    strength <= 1 ? "Muy débil" :
    strength === 2 ? "Débil" :
    strength === 3 ? "Aceptable" :
    strength === 4 ? "Fuerte" : "Muy fuerte";

  const validations = useMemo(() => {
    const r = PASSWORD_RULES;
    return {
      minLen: form.next.length >= r.minLen,
      upper: !r.requireUpper || /[A-Z]/.test(form.next),
      lower: !r.requireLower || /[a-z]/.test(form.next),
      number: !r.requireNumber || /\d/.test(form.next),
      symbol: !r.requireSymbol || /[^A-Za-z0-9]/.test(form.next),
      notSameAsCurrent: !!form.next && form.next !== form.current,
      matches: !!form.next && form.next === form.confirm,
    };
  }, [form]);

  const allOk = Object.values(validations).every(Boolean);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!allOk || submitting) return;
    setSubmitting(true);
    try {
      await changePassword({
        currentPassword: form.current,
        newPassword: form.next,
      });

      // ⚠️ Opcional: aquí también podrías:
      // - Llamar endpoint que registre en Bitácora (CHANGE_PASSWORD)
      // - Llamar endpoint que agregue a Historial de Contraseñas

      toast({ title: "Contraseña actualizada correctamente.", status: "success", duration: 2500 });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      const msg =
        err?.message ||
        (err?.status === 401 ? "Contraseña actual incorrecta." : "No se pudo cambiar la contraseña.");
      toast({ title: "Error", description: msg, status: "error", duration: 3000 });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Título + Back (fuera del contenedor) */}
      <Box px={8} pt={4}>
        <Heading size="md" color={accent}>Cambiar Contraseña</Heading>
        <Button mt={2} size="sm" onClick={() => navigate(-1)} w="fit-content">←</Button>
      </Box>
      <Divider my={4} />

      {/* Card */}
      <Box
        mx={8}
        p={6}
        bg={cardBg}
        borderWidth="1px"
        borderColor={border}
        borderRadius="lg"
        boxShadow="lg"
        maxW="700px"
      >
        <Text fontSize="sm" color={muted} mb={4}>
          Actualiza tu contraseña de acceso. Se registrará en el historial y en la bitácora del sistema.
        </Text>

        {/* Actual */}
        <FormControl mb={4}>
          <FormLabel>Contraseña actual</FormLabel>
          <InputGroup>
            <Input
              name="current"
              type={showCurrent ? "text" : "password"}
              value={form.current}
              onChange={handleChange}
              placeholder="Ingresa tu contraseña actual"
              autoComplete="current-password"
            />
            <InputRightElement>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={showCurrent ? "Ocultar" : "Mostrar"}
                icon={showCurrent ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowCurrent((s) => !s)}
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>

        {/* Nueva */}
        <FormControl mb={2}>
          <FormLabel>Nueva contraseña</FormLabel>
          <InputGroup>
            <Input
              name="next"
              type={showNew ? "text" : "password"}
              value={form.next}
              onChange={handleChange}
              placeholder="Ingresa la nueva contraseña"
              autoComplete="new-password"
            />
            <InputRightElement>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={showNew ? "Ocultar" : "Mostrar"}
                icon={showNew ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowNew((s) => !s)}
              />
            </InputRightElement>
          </InputGroup>
        </FormControl>

        {/* Fuerza */}
        <Flex align="center" gap={3} mb={4}>
          <Progress value={strengthPct} flex="1" size="sm" borderRadius="md" />
          <Text fontSize="sm" color={muted} minW="92px">
            {strengthLabel}
          </Text>
        </Flex>

        {/* Reglas */}
        <Box mb={4}>
          <Text fontSize="sm" mb={1} color={muted}>Requisitos:</Text>
          <List spacing={1} fontSize="sm">
            <ListItem>
              <ListIcon as={validations.minLen ? CheckCircleIcon : WarningIcon} color={validations.minLen ? "green.400" : "orange.400"} />
              Mínimo {PASSWORD_RULES.minLen} caracteres
            </ListItem>
            {PASSWORD_RULES.requireUpper && (
              <ListItem>
                <ListIcon as={validations.upper ? CheckCircleIcon : WarningIcon} color={validations.upper ? "green.400" : "orange.400"} />
                Al menos una mayúscula (A-Z)
              </ListItem>
            )}
            {PASSWORD_RULES.requireLower && (
              <ListItem>
                <ListIcon as={validations.lower ? CheckCircleIcon : WarningIcon} color={validations.lower ? "green.400" : "orange.400"} />
                Al menos una minúscula (a-z)
              </ListItem>
            )}
            {PASSWORD_RULES.requireNumber && (
              <ListItem>
                <ListIcon as={validations.number ? CheckCircleIcon : WarningIcon} color={validations.number ? "green.400" : "orange.400"} />
                Al menos un número (0-9)
              </ListItem>
            )}
            {PASSWORD_RULES.requireSymbol && (
              <ListItem>
                <ListIcon as={validations.symbol ? CheckCircleIcon : WarningIcon} color={validations.symbol ? "green.400" : "orange.400"} />
                Al menos un símbolo (!@#$%…)
              </ListItem>
            )}
            <ListItem>
              <ListIcon as={validations.notSameAsCurrent ? CheckCircleIcon : WarningIcon} color={validations.notSameAsCurrent ? "green.400" : "orange.400"} />
              Debe ser distinta a la actual
            </ListItem>
            <ListItem>
              <ListIcon as={validations.matches ? CheckCircleIcon : WarningIcon} color={validations.matches ? "green.400" : "orange.400"} />
              Debe coincidir con la confirmación
            </ListItem>
          </List>
        </Box>

        {/* Confirmación */}
        <FormControl mb={6}>
          <FormLabel>Confirmar nueva contraseña</FormLabel>
          <InputGroup>
            <Input
              name="confirm"
              type={showConfirm ? "text" : "password"}
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repite la nueva contraseña"
              autoComplete="new-password"
            />
            <InputRightElement>
              <IconButton
                size="sm"
                variant="ghost"
                aria-label={showConfirm ? "Ocultar" : "Mostrar"}
                icon={showConfirm ? <ViewOffIcon /> : <ViewIcon />}
                onClick={() => setShowConfirm((s) => !s)}
              />
            </InputRightElement>
          </InputGroup>
          {form.confirm && !validations.matches && (
            <Text mt={1} fontSize="sm" color="orange.400">
              Las contraseñas no coinciden.
            </Text>
          )}
        </FormControl>

        {/* Botones */}
        <Flex gap={3} justify="flex-end">
          <Button variant="ghost" onClick={() => setForm({ current: "", next: "", confirm: "" })} isDisabled={submitting}>
            Limpiar
          </Button>
          <Button colorScheme="teal" onClick={handleSubmit} isDisabled={!allOk || submitting} isLoading={submitting}>
            Guardar cambios
          </Button>
        </Flex>
      </Box>
    </>
  );
}
