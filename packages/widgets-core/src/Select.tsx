import React from "react";
import MuiSelect from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Select({
  nodeId,
  nodeType,
  value,
  onChange,
  disabled,
  label,
  options,
  mode,
}: WidgetProps) {
  const opts = Array.isArray(options)
    ? options
    : options && typeof options === "object" && "options" in (options as Record<string, unknown>)
    ? (options as { options: { value: unknown; label: string }[] }).options
    : [];

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel>{label ?? ""}</InputLabel>
      <MuiSelect
        data-nodeid={mode === "design" ? nodeId : undefined}
        data-nodetype={mode === "design" ? nodeType : undefined}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        label={label ?? ""}
      >
        {opts.map((opt: unknown, i: number) => {
          const o = typeof opt === "object" && opt && "value" in (opt as object)
            ? (opt as { value: unknown; label?: string })
            : { value: opt, label: String(opt) };
          return (
            <MenuItem key={i} value={o.value as string}>
              {o.label ?? String(o.value)}
            </MenuItem>
          );
        })}
      </MuiSelect>
    </FormControl>
  );
}
