// src/components/auth/ForgotPasswordModal.jsx
import React, { useState } from "react";
import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Button, FormControl, FormLabel, Input, useToast, Text
} from "@chakra-ui/react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const submit = async () => {
    try {
      setLoading(true);
      const actionCodeSettings = {
        url: process.env.REACT_APP_RESET_PASSWORD_URL || "http://localhost:3000/reset-password",
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      toast({ title: "Revisa tu correo", description: "Te enviamos el enlace de reseteo.", status: "success" });
      setEmail("");
      onClose();
    } catch (e) {
      toast({ title: "No se pudo enviar", description: e.message, status: "error" });
    } finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Recuperar contraseña</ModalHeader>
        <ModalBody>
          <Text mb={3}>Ingresa tu correo y te enviaremos un enlace para restablecerla.</Text>
          <FormControl isRequired>
            <FormLabel>Correo</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormControl>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button colorScheme="blue" isLoading={loading} onClick={submit}>Enviar</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
