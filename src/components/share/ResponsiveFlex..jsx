// src/components/shared/ResponsiveFlex.jsx
import React from "react";
import { Flex } from "@chakra-ui/react";

const ResponsiveFlex = ({ children, ...props }) => {
  return (
    <Flex
      direction={{ base: "column", md: "row" }}
      gap={{ base: 3, md: 4 }}
      align={{ base: "stretch", md: "center" }}
      w="100%"
      {...props}
    >
      {children}
    </Flex>
  );
};

export default ResponsiveFlex;
