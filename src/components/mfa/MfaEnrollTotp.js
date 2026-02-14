// src/components/mfa/MfaEnrollTotp.jsx
import React, { useEffect, useState } from "react";
import { Box, Image, Input, Button, Text, useToast } from "@chakra-ui/react";
import { API_URL } from "../../config";

export default function MfaEnrollTotp({ onDone }) {
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const uid = localStorage.getItem("userEmail");
      if (!uid) return toast({ title: "Error", description: "Usuario no encontrado", status: "error" });

      const res = await fetch(`${API_URL}/mfa/enroll/start?uid=${uid}`);
      const data = await res.json();

      if (data.alreadyEnabled) {
        onDone?.();
        return;
      }

      if (res.ok && data.qr) setQr(data.qr);
      else toast({ title: "Error", description: "No se pudo generar el QR", status: "error" });
    })();
  }, [toast, onDone]);

  const handleConfirm = async () => {
    const uid = localStorage.getItem("userEmail");
    if (!uid || !code) return toast({ title: "Error", description: "Ingresa el código", status: "error" });

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/mfa/enroll/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Error verificando el código.");

      toast({ title: "2FA activado", description: "Autenticación configurada correctamente", status: "success" });
      onDone?.();
    } catch (err) {
      toast({ title: "Error", description: err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box textAlign="center">
      {qr ? (
        <>
          <Image src={qr} alt="Código QR" mx="auto" mb={4} boxSize="200px" />
          <Text>Escanea este código con Google Authenticator</Text>
          <Input
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            textAlign="center"
            mb={3}
          />
          <Button colorScheme="teal" onClick={handleConfirm} isLoading={loading}>
            Confirmar y acceder
          </Button>
        </>
      ) : (
        <Text>Cargando código QR...</Text>
      )}
    </Box>
  );
}
