import React from "react";
import TextField from "@mui/material/TextField";
import type { WidgetProps } from "@ai-low-code/renderer";

export function TextInput({
  nodeId,
  nodeType,
  value,
  onChange,
  disabled,
  error,
  label,
  mode,
}: WidgetProps) {
  return (
    <TextField
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      fullWidth
      label={label}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      error={error != null && error.length > 0}
      helperText={error?.[0]}
    />
  );
}
