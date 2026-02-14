// src/components/shared/ResponsiveFormRow.jsx
import React from "react";
import { Flex } from "@chakra-ui/react";

const ResponsiveFormRow = ({ children, ...props }) => {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={{ base: 3, md: 4 }}
      w="100%"
      {...props}
    >
      {children}
    </Flex>
  );
};

export default ResponsiveFormRow;
