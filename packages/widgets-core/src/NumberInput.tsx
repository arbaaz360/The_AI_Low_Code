import React from "react";
import TextField from "@mui/material/TextField";
import type { WidgetProps } from "@ai-low-code/renderer";

export function NumberInput({
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange?.("");
      return;
    }
    const num = Number(raw);
    onChange?.(Number.isNaN(num) ? raw : num);
  };

  return (
    <TextField
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      fullWidth
      type="number"
      label={label}
      placeholder={(props?.placeholder as string) ?? ""}
      value={value ?? ""}
      onChange={handleChange}
      disabled={disabled}
      error={error != null && error.length > 0}
      helperText={error?.[0]}
      inputProps={{
        min: props?.min as number | undefined,
        max: props?.max as number | undefined,
        step: props?.step as number | undefined,
      }}
    />
  );
}
