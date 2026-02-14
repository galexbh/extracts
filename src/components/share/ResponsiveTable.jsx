// src/components/shared/ResponsiveTable.jsx
import React from "react";
import { Box } from "@chakra-ui/react";

const ResponsiveTable = ({ children, ...props }) => {
  return (
    <Box
      w="100%"
      overflowX="auto"
      overflowY="hidden"
      borderRadius="md"
      {...props}
    >
      {children}
    </Box>
  );
};

export default ResponsiveTable;
