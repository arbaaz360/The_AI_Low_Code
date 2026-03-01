import React from "react";
import Box from "@mui/material/Box";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Stack({
  nodeId,
  nodeType,
  props,
  children,
  mode,
}: WidgetProps) {
  const direction = (props?.direction as string) === "row" ? "row" : "column";

  return (
    <Box
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      sx={{ display: "flex", flexDirection: direction, gap: 1 }}
    >
      {children}
    </Box>
  );
}
