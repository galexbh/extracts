import React, { useEffect, useState } from "react";
import {
  Box, Flex, Heading, FormControl, FormLabel, Input, Button,
  Text, useToast, Image, Stack, FormHelperText, useColorModeValue
} from "@chakra-ui/react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../../firebase";
import { traducirErrorFirebase } from "../../utils/firebaseErrors"; // ✅ Importar traducciones
import { API_URL } from "../../config";
import axios from "axios";
import signInLogo from "../login/log.png";

export default function ResetPasswordPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Colores iguales a tu login
  const titleColor = useColorModeValue("teal.500", "teal.300");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const bgForm = useColorModeValue("gray.100", "gray.700");
  const shadowForm = useColorModeValue("md", "dark-lg");
  const pageBg = useColorModeValue("gray.50", "gray.900");

  // 1️⃣ Obtener el código del enlace de restablecimiento
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oob = params.get("oobCode");
    setCode(oob || "");
    if (oob) {
      verifyPasswordResetCode(auth, oob)
        .then((em) => { setEmail(em); setReady(true); })
        .catch(() => toast({ title: "Enlace inválido o expirado", status: "error" }));
    }
  }, [toast]);

  // 2️⃣ Enviar nueva contraseña
  const submit = async () => {
    if (!pwd1 || !pwd2) {
      toast({
        title: "Campos vacíos",
        description: "Escribe y confirma tu nueva contraseña.",
        status: "warning",
      });
      return;
    }
    if (pwd1 !== pwd2) {
      toast({
        title: "No coinciden",
        description: "Las contraseñas deben ser iguales.",
        status: "warning",
      });
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Restablecer contraseña en Firebase
      await confirmPasswordReset(auth, code, pwd1);

      // 2️⃣ Resetear MFA en el backend
      try {
        await axios.post(`${API_URL}/mfa/reset`, { email });
        console.log("✅ MFA reseteado correctamente");
      } catch (mfaError) {
        console.error("⚠️ Error reseteando MFA (continuando):", mfaError);
        // No bloqueamos el flujo si falla el reset de MFA
      }

      toast({
        title: "Contraseña actualizada correctamente",
        description: "Deberás configurar tu autenticación de dos pasos nuevamente.",
        status: "success",
        duration: 5000,
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (e) {
      // ✅ Aquí usamos la función de traducción
      const mensajeTraducido = traducirErrorFirebase(e.code, e.message);
      toast({
        title: "Error al restablecer",
        description: mensajeTraducido,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;
  const canSubmit = !!pwd1 && !!pwd2 && pwd1 === pwd2;

  return (
    <Flex minH="100vh" align="center" justify="center" bg={pageBg} px={4}>
      <Box
        w="full" maxW="360px" p={6}
        bg={bgForm} boxShadow={shadowForm} borderRadius="12px"
      >
        <Stack spacing={5}>
          <Image src={signInLogo} alt="Extractus" w="90px" mx="auto" />
          <Heading color={titleColor} fontSize="lg" textAlign="center">
            Restablecer contraseña
          </Heading>
          <Text fontSize="sm" color={textColor} textAlign="center">
            Cuenta: {email}
          </Text>

          <FormControl>
            <FormLabel fontSize="sm">Nueva contraseña</FormLabel>
            <Input
              type="password"
              placeholder="Escribe la nueva contraseña"
              fontSize="xs" h="34px"
              borderRadius="8px"
              borderWidth="2px"
              borderColor="green.400"
              _hover={{ borderColor: "green.500" }}
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
              value={pwd1}
              onChange={(e) => setPwd1(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm">Confirmar contraseña</FormLabel>
            <Input
              type="password"
              placeholder="Repite la nueva contraseña"
              fontSize="xs" h="34px"
              borderRadius="8px"
              borderWidth="2px"
              borderColor="green.400"
              _hover={{ borderColor: "green.500" }}
              _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px green.500" }}
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
            />
            <FormHelperText fontSize="xs" color={pwd2 && pwd1 !== pwd2 ? "red.400" : "gray.500"}>
              {pwd2 && pwd1 !== pwd2 ? "Las contraseñas no coinciden." : "Repite la nueva contraseña."}
            </FormHelperText>
          </FormControl>

          <Button
            bg="teal.400" color="white"
            _hover={{ bg: "teal.300" }} _active={{ bg: "teal.500" }}
            isLoading={loading}
            isDisabled={!canSubmit}
            h="34px" fontSize="sm"
            onClick={submit}
          >
            Actualizar contraseña
          </Button>
        </Stack>
      </Box>
    </Flex>
  );
}
