// src/components/mfa/MfaVerifyTotp.jsx
import React, { useState } from "react";
import { Box, Input, Button, Text, useToast } from "@chakra-ui/react";
import { API_URL } from "../../config";

export default function MfaVerifyTotp({ onVerified }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleVerify = async () => {
    const uid = localStorage.getItem("userEmail");
    if (!uid || !code) {
      toast({ title: "Error", description: "Faltan datos", status: "error" });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);

      toast({ title: "Verificado", description: "Acceso permitido", status: "success" });
      onVerified?.();
    } catch (err) {
      toast({ title: "Código inválido", description: err.message, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box textAlign="center">
      <Text mb={3}>Ingresa el código de 6 dígitos del Google Authenticator</Text>
      <Input
        placeholder="Código 2FA"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={6}
        textAlign="center"
        mb={3}
      />
      <Button colorScheme="teal" onClick={handleVerify} isLoading={loading}>
        Verificar
      </Button>
    </Box>
  );
}
