// src/components/shared/ResponsiveContainer.jsx
import React from "react";
import { Box, useColorModeValue } from "@chakra-ui/react";

const ResponsiveContainer = ({ children, ...props }) => {
  const bg = useColorModeValue("gray.50", "gray.900");

  return (
    <Box
      w="100%"
      minH="calc(100vh - 80px)" // ajusta según tu header
      px={{ base: 3, md: 6, lg: 10 }}
      py={{ base: 3, md: 5 }}
      bg={bg}
      overflowX="hidden"
      {...props}
    >
      {children}
    </Box>
  );
};

export default ResponsiveContainer;
