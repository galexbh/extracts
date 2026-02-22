// ============================================================
// 📁 src/components/login/Login.jsx
// 💎 Login con Firebase + MFA + persistencia correcta de sesión
// ============================================================

import React, { useEffect, useState } from "react";
import {
  Box,
  Flex,
  Button,
  FormControl,
  Input,
  InputGroup,
  InputLeftElement,
  Heading,
  Link as ChakraLink,
  Switch,
  Text,
  Image,
  useToast,
  useColorModeValue,
  InputRightElement,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from "@chakra-ui/react";
import { EmailIcon, LockIcon, ViewIcon, ViewOffIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../../firebase";
import signInLogo from "./log.png";
import { mfaGenerate, mfaVerify } from "../auth/mfaClient";
import { traducirErrorFirebase } from "../../utils/firebaseErrors";
import { API_URL } from "../../config";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [error, setError] = useState("");
  const [emailRecuperar, setEmailRecuperar] = useState("");
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [qr, setQr] = useState(null);
  const [secret, setSecret] = useState(null); // 🔐 Secreto temporal para primera inscripción
  const [code, setCode] = useState("");
  const [uid, setUid] = useState("");

  const toast = useToast();
  const navigate = useNavigate();

  const titleColor = useColorModeValue("teal.500", "teal.300");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const bgForm = useColorModeValue("gray.100", "gray.700");
  const shadowForm = useColorModeValue("md", "dark-lg");

  useEffect(() => {
    const savedRemember = localStorage.getItem("rememberMe") === "true";
    const savedEmail = localStorage.getItem("rememberEmail") || "";
    const savedPass = localStorage.getItem("rememberPass") || "";
    setRememberMe(savedRemember);
    if (savedRemember && savedEmail) {
      setUser(savedEmail);
      if (savedPass) setPass(atob(savedPass)); // decodificar base64
    }
  }, []);

  const safeEmail = (s) => (s || "").trim().toLowerCase();

  const showErr = (e, fallback) => {
    const msg = traducirErrorFirebase(e?.code, e?.message) || fallback || "Error desconocido";
    setError(msg);
    toast({
      title: "Error",
      description: msg,
      status: "error",
      duration: 3500,
      isClosable: true,
    });
  };

  /* =====================================================
     1️⃣ LOGIN → VERIFICAR ESTADO MFA Y MOSTRAR CÓDIGO
     ===================================================== */
  const handleLogin = async () => {
    setError("");
    const email = safeEmail(user);
    if (!email || !pass) return setError("Ingresa correo y contraseña.");

    try {
      setLoadingLogin(true);
      // 🔥 Persistencia LOCAL siempre
      await setPersistence(auth, browserLocalPersistence);

      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await cred.user.getIdToken();
      const userUid = cred.user.uid;
      setUid(userUid);

      // 🔹 Limpiar valores antiguos sin borrar todo el almacenamiento
      localStorage.removeItem("uid");
      localStorage.removeItem("userEmail");
      sessionStorage.clear();

      // ✅ Guardar UID y correo (para Sidebar y backend)
      localStorage.setItem("uid", userUid);
      localStorage.setItem("userEmail", email);

      // 💾 Recordar dispositivo: guardar o limpiar email + contraseña
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberEmail", email);
        localStorage.setItem("rememberPass", btoa(pass)); // Base64
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberEmail");
        localStorage.removeItem("rememberPass");
      }

      // Token: en localStorage si recuerda, en sessionStorage si no
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("idToken", idToken);

      // ✅ Guardar datos básicos del usuario
      localStorage.setItem(
        "usuario",
        JSON.stringify({
          id_usuario: userUid,
          correo: email,
        })
      );

      // 🔹 Verificar si el usuario ya tiene MFA activado
      const statusRes = await fetch(
        `${API_URL}/mfa/status?uid=${encodeURIComponent(userUid)}`
      );
      const status = await statusRes.json();

      if (status.enrolled) {
        console.log("🟢 Usuario con MFA activo");
        setQr(null);
        setSecret(null); // Sin secreto temporal para usuarios ya inscritos
        setShowMfaModal(true);
      } else {
        console.log("🟡 Usuario sin MFA → generando QR...");
        const data = await mfaGenerate(userUid, email);
        if (!data.qr) throw new Error("No se pudo generar el QR temporal.");
        setQr(data.qr);
        setSecret(data.secret); // 🔐 Guardar secreto temporal para verificación
        console.log("🔑 Secreto temporal guardado, esperando verificación...");
        setShowMfaModal(true);
      }
    } catch (e) {
      showErr(e, "No se pudo iniciar sesión.");
    } finally {
      setLoadingLogin(false);
    }
  };

  /* =====================================================
     2️⃣ VERIFICAR CÓDIGO DE 6 DÍGITOS (GOOGLE AUTH)
     ===================================================== */
  const handleVerifyCode = async () => {
    try {
      // 🔐 Pasar el secreto solo si es primera inscripción (cuando hay QR visible)
      const data = await mfaVerify(uid, code, secret);
      if (data.success) {
        toast({ title: "Acceso concedido ✅", status: "success" });
        setShowMfaModal(false);
        navigate("/app", { replace: true });
      } else {
        toast({
          title: "Código inválido ❌",
          description: data.message || "Intenta nuevamente",
          status: "error",
        });
      }
    } catch (error) {
      showErr(error, "Error verificando el código 2FA.");
    }
  };

  const handleSubmitLogin = (e) => {
    e.preventDefault();
    handleLogin();
  };

  /* =====================================================
     3️⃣ RECUPERAR CONTRASEÑA
     ===================================================== */
  const handleEnviarRecuperacion = async () => {
    const email = safeEmail(emailRecuperar || user);
    if (!email) {
      return toast({
        title: "Error",
        description: "Ingresa un correo válido",
        status: "error",
      });
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Correo enviado",
        description: `Revisa ${email}`,
        status: "success",
      });
      setEmailRecuperar("");
      setMode("login");
    } catch (e) {
      toast({
        title: "Error",
        description: traducirErrorFirebase(e?.code, e?.message),
        status: "error",
      });
    }
  };

  /* =====================================================
     RENDER DEL FORMULARIO
     ===================================================== */
  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      w="full"
      minH="100vh"
      p="4"
    >
      <Box
        bg={bgForm}
        boxShadow={shadowForm}
        borderRadius="16px"
        p="8"
        w="full"
        maxW="380px"
        mx="auto"
      >
        <Flex justify="center" mb="4">
          <Image src={signInLogo} alt="Logo" boxSize="80px" />
        </Flex>

        <Heading color={titleColor} fontSize="xl" mb="4" textAlign="center">
          {mode === "recover" ? "Recuperar contraseña" : "Iniciar sesión"}
        </Heading>

        <Text mb="4" color={textColor} fontSize="sm" textAlign="center">
          {mode === "recover"
            ? "Ingresa tu correo para recuperar tu contraseña"
            : "Accede con tu correo y contraseña"}
        </Text>

        {mode === "login" && error && (
          <Text color="red.500" fontSize="sm" mb="2">
            {error}
          </Text>
        )}

        {mode === "login" && (
          <form id="login-form" autoComplete="on" onSubmit={handleSubmitLogin}>
            <FormControl>
              <InputGroup mb="4">
                <InputLeftElement pointerEvents="none">
                  <EmailIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  borderColor="green.400"
                  borderRadius="10px"
                  h="44px"
                />
              </InputGroup>

              <InputGroup mb="5">
                <InputLeftElement pointerEvents="none">
                  <LockIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  borderColor="green.400"
                  borderRadius="10px"
                  h="44px"
                />
                <InputRightElement>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <ViewOffIcon /> : <ViewIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>

              <Flex align="center" justify="space-between" mb="4">
                <Flex align="center" gap={2}>
                  <Switch
                    isChecked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    colorScheme="teal"
                  />
                  <Text fontSize="sm" color={textColor}>
                    Recordar este dispositivo
                  </Text>
                </Flex>
              </Flex>

              <Button
                type="submit"
                isLoading={loadingLogin}
                loadingText="Ingresando..."
                bg="teal.400"
                color="white"
                w="100%"
                h="44px"
                fontSize="sm"
                _hover={{ bg: "teal.300" }}
              >
                Iniciar sesión
              </Button>

              <ChakraLink
                mt="3"
                fontSize="sm"
                color={titleColor}
                display="block"
                textAlign="center"
                onClick={() => setMode("recover")}
              >
                ¿Olvidaste tu contraseña?
              </ChakraLink>
            </FormControl>
          </form>
        )}

        {mode === "recover" && (
          <FormControl>
            <InputGroup mb="4">
              <InputLeftElement pointerEvents="none">
                <EmailIcon color="gray.400" />
              </InputLeftElement>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={emailRecuperar}
                onChange={(e) => setEmailRecuperar(e.target.value)}
                borderColor="green.400"
                borderRadius="10px"
                h="44px"
              />
            </InputGroup>
            <Button
              bg="teal.400"
              color="white"
              w="100%"
              h="44px"
              fontSize="sm"
              mb="2"
              _hover={{ bg: "teal.300" }}
              onClick={handleEnviarRecuperacion}
            >
              Enviar correo
            </Button>
            <ChakraLink
              fontSize="sm"
              color={titleColor}
              display="block"
              textAlign="center"
              onClick={() => setMode("login")}
            >
              Volver
            </ChakraLink>
          </FormControl>
        )}
      </Box>

      {/* === MODAL 2FA === */}
      <Modal
        isOpen={showMfaModal}
        onClose={() => setShowMfaModal(false)}
        isCentered
        size="md"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Verificación en dos pasos</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {!qr && (
              <Text mb={3} fontSize="sm" color={textColor}>
                Ingresa el código de 6 dígitos de Google Authenticator
              </Text>
            )}
            {qr && (
              <>
                <Text mb={3} fontSize="sm" color={textColor}>
                  Escanea este código QR con Google Authenticator y luego
                  escribe el código:
                </Text>
                <Flex justify="center" mb={4}>
                  <Image src={qr} alt="QR Code" boxSize="200px" />
                </Flex>
              </>
            )}
            <Input
              placeholder="Código de verificación"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              textAlign="center"
              fontSize="xl"
              mb={3}
            />
            <Button colorScheme="teal" w="full" onClick={handleVerifyCode}>
              Verificar
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
