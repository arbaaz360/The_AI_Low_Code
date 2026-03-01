import React from "react";
import MuiButton from "@mui/material/Button";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Button({
  nodeId,
  nodeType,
  props,
  onClick,
  disabled,
  label,
  mode,
}: WidgetProps) {
  const variant = (props?.variant as "contained" | "outlined" | "text") ?? "contained";
  const color = (props?.color as "primary" | "secondary" | "error" | "info" | "success" | "warning") ?? "primary";

  return (
    <MuiButton
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      variant={variant}
      color={color}
      disabled={disabled}
      onClick={() => onClick?.()}
    >
      {label ?? "Button"}
    </MuiButton>
  );
}
