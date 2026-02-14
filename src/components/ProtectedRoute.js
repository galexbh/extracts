import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Spinner, Flex } from "@chakra-ui/react";

export default function ProtectedRoute({ children }) {
  const { user, loadingAuth } = useContext(AuthContext);

  if (loadingAuth) {
    return (
      <Flex justify="center" align="center" h="100vh">
        <Spinner size="xl" color="teal.500" />
      </Flex>
    );
  }

  if (!user) {
    // 🔒 Si no hay usuario autenticado (y ya terminó de cargar), redirige al login
    return <Navigate to="/" replace />;
  }

  return children;
}
