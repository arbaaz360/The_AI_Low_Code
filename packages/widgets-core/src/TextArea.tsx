import React from "react";
import TextField from "@mui/material/TextField";
import type { WidgetProps } from "@ai-low-code/renderer";

export function TextArea({
  nodeId,
  nodeType,
  props,
  value,
  onChange,
  disabled,
  error,
  label,
  mode,
}: WidgetProps) {
  const minRows = typeof props?.minRows === "number" ? props.minRows : 3;
  return (
    <TextField
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      fullWidth
      multiline
      minRows={minRows}
      label={label}
      placeholder={(props?.placeholder as string) ?? ""}
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      error={error != null && error.length > 0}
      helperText={error?.[0]}
    />
  );
}
