import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Section({
  nodeId,
  nodeType,
  props,
  children,
  mode,
}: WidgetProps) {
  const title = (props?.title as string) ?? "";

  return (
    <Box
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      sx={{ mb: 2 }}
    >
      {title && (
        <Typography variant="h6" sx={{ mb: 1 }}>
          {title}
        </Typography>
      )}
      <Box>{children}</Box>
    </Box>
  );
}
