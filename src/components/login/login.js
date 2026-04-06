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
  FormHelperText,
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
  signOut,
} from "firebase/auth";
import { auth } from "../../firebase";
import signInLogo from "./log.png";
import { mfaGenerate, mfaVerify } from "../auth/mfaClient";
import { traducirErrorFirebase } from "../../utils/firebaseErrors";
import { API_URL } from "../../config";

export default function Login() {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const [mode, setMode] = useState("login");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [error, setError] = useState("");
  const [loginInfo, setLoginInfo] = useState("");
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
    setRememberMe(savedRemember);
    if (savedRemember && savedEmail) {
      setUser(savedEmail);
    }
    // Limpiar contraseña guardada si existía (migración segura)
    localStorage.removeItem("rememberPass");
  }, []);

  const safeEmail = (s) => (s || "").trim().toLowerCase();
  const isValidEmail = (value) => EMAIL_REGEX.test(safeEmail(value));
  const showEmailHint = user.trim().length > 0 && !isValidEmail(user);
  const formatLockTime = (seconds = 0) => {
    const total = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(total / 60);
    const sec = total % 60;
    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
  };

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  };

  const consultarEstadoLogin = async (email) =>
    fetchJson(`${API_URL}/auth/login-status?email=${encodeURIComponent(email)}`);

  const registrarLoginFallido = async (email, reason) =>
    fetchJson(`${API_URL}/auth/login-failed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, reason }),
    });

  const resetearIntentosLogin = async (email) =>
    fetchJson(`${API_URL}/auth/login-reset-attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

  const completarLogin = async (email) =>
    fetchJson(`${API_URL}/auth/login-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

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
     1. LOGIN -> VERIFICAR ESTADO MFA Y MOSTRAR CODIGO
     ===================================================== */

  const handleLogin = async () => {
    setError("");
    setLoginInfo("");

    if (!user.trim() || !pass) {
      setError("Ingresa correo y contraseña.");
      return;
    }

    const email = safeEmail(user);
    if (!isValidEmail(email)) {
      setError("Ingresa un correo con formato válido, por ejemplo usuario@dominio.com.");
      return;
    }

    try {
      setLoadingLogin(true);

      const estadoRes = await consultarEstadoLogin(email);
      const estadoData = estadoRes.data || {};

      if (estadoData.blocked) {
        setError("Tu cuenta está bloqueada temporalmente por intentos fallidos.");
        setLoginInfo(`Intenta nuevamente en ${formatLockTime(estadoData.lockRemainingSeconds)}.`);
        return;
      }

      if (estadoData.exists && !estadoData.permitido) {
        const nombreEstado = estadoData.estado || "Inactivo";
        const mensajes = {
          inactivo: "Tu cuenta está inactiva. Contacta al administrador.",
          bloqueado: "Tu cuenta está bloqueada. Contacta al administrador.",
        };
        setError(
          mensajes[String(nombreEstado).toLowerCase()] ||
          `Tu cuenta se encuentra en estado "${nombreEstado}". Contacta al administrador.`
        );
        return;
      }

      await setPersistence(auth, browserLocalPersistence);

      const cred = await signInWithEmailAndPassword(auth, email, pass);
      await resetearIntentosLogin(email);

      const idToken = await cred.user.getIdToken();
      const userUid = cred.user.uid;
      setUid(userUid);

      localStorage.removeItem("uid");
      localStorage.removeItem("userEmail");
      sessionStorage.clear();

      localStorage.setItem("uid", userUid);
      localStorage.setItem("userEmail", email);

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberEmail");
      }

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("idToken", idToken);
      localStorage.setItem("usuario", JSON.stringify({ id_usuario: userUid, correo: email }));

      const estadoFinalRes = await fetch(
        `${API_URL}/seguridad/usuarios/estado-login?uid=${encodeURIComponent(userUid)}&email=${encodeURIComponent(email)}`
      );
      const estadoFinalData = await estadoFinalRes.json();

      if (!estadoFinalData.permitido) {
        await signOut(auth);
        const keep = ["rememberMe", "rememberEmail", "rememberPass"];
        Object.keys(localStorage).forEach((k) => {
          if (!keep.includes(k)) localStorage.removeItem(k);
        });
        sessionStorage.clear();

        const nombreEstado = estadoFinalData.estado || "Inactivo";
        const mensajes = {
          inactivo: "Tu cuenta está inactiva. Contacta al administrador.",
          bloqueado: "Tu cuenta está bloqueada. Contacta al administrador.",
        };
        const msg =
          mensajes[String(nombreEstado).toLowerCase()] ||
          `Tu cuenta se encuentra en estado "${nombreEstado}". Contacta al administrador.`;

        setError(msg);
        toast({ title: "Acceso denegado", description: msg, status: "error", duration: 5000, isClosable: true });
        return;
      }

      const statusRes = await fetch(`${API_URL}/mfa/status?uid=${encodeURIComponent(userUid)}`);
      const status = await statusRes.json();

      if (status.enrolled) {
        setQr(null);
        setSecret(null);
        setShowMfaModal(true);
      } else {
        const data = await mfaGenerate(userUid, email);
        if (!data.qr) throw new Error("No se pudo generar el QR temporal.");
        setQr(data.qr);
        setSecret(data.secret);
        setShowMfaModal(true);
      }
    } catch (e) {
      const errorCode = e?.code || "";
      if (
        errorCode === "auth/invalid-credential" ||
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/user-not-found" ||
        errorCode === "auth/invalid-login-credentials"
      ) {
        const intentoRes = await registrarLoginFallido(email, errorCode);
        const intentoData = intentoRes.data || {};

        if (intentoData.blocked) {
          setError("Tu cuenta está bloqueada temporalmente por intentos fallidos.");
          setLoginInfo(`Intenta nuevamente en ${formatLockTime(intentoData.lockRemainingSeconds)}.`);
          return;
        }

        setError("Correo o contraseña incorrectos.");
        if (typeof intentoData.attemptsRemaining === "number") {
          setLoginInfo(`Te quedan ${intentoData.attemptsRemaining} intento(s) antes del bloqueo temporal.`);
        }
        return;
      }

      showErr(e, "No se pudo iniciar sesión.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = localStorage.getItem("userEmail") || "";
    if (!isValidEmail(email)) {
      return toast({
        title: "Error",
        description: "Ingresa un correo con formato válido, por ejemplo usuario@dominio.com.",
        status: "error",
      });
    }
    try {
      // Pasar el secreto solo si es primera inscripción (cuando hay QR visible)
      const data = await mfaVerify(uid, code, secret);
      if (data.success) {
        // Obtener el rol del usuario y guardarlo para filtrado multi-usuario
        try {
          await completarLogin(email);
          const rolRes = await fetch(
            `${API_URL}/seguridad/usuarios/rol?email=${encodeURIComponent(email)}`
          );
          if (rolRes.ok) {
            const rolData = await rolRes.json();
            if (rolData.nombre_rol) {
              localStorage.setItem("userRol", rolData.nombre_rol);
            }
          }
        } catch (_) {
          // No bloquear el login si falla obtener el rol
        }

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
     3. RECUPERAR CONTRASEÑA
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
        {mode === "login" && loginInfo && (
          <Text color="orange.400" fontSize="sm" mb="2">
            {loginInfo}
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
                  isInvalid={showEmailHint}
                  borderColor="green.400"
                  borderRadius="10px"
                  h="44px"
                />
              </InputGroup>
              {showEmailHint && (
                <FormHelperText color="orange.500" mt="-2" mb="3">
                  El correo debe incluir nombre, @, dominio y extensión. Ejemplo: usuario@dominio.com
                </FormHelperText>
              )}

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
