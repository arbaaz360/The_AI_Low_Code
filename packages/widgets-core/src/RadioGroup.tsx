import React from "react";
import MuiRadio from "@mui/material/Radio";
import RadioGroupMui from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import type { WidgetProps } from "@ai-low-code/renderer";

export function RadioGroup({
  nodeId,
  nodeType,
  value,
  onChange,
  disabled,
  loading,
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
    <FormControl
      fullWidth
      disabled={disabled || loading}
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
    >
      <FormLabel>{label ?? ""}</FormLabel>
      {loading && <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>Loading&hellip;</Typography>}
      <RadioGroupMui
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
      >
        {opts.map((opt: unknown, i: number) => {
          const o = typeof opt === "object" && opt && "value" in (opt as object)
            ? (opt as { value: unknown; label?: string })
            : { value: opt, label: String(opt) };
          return (
            <FormControlLabel
              key={i}
              value={o.value as string}
              control={<MuiRadio />}
              label={o.label ?? String(o.value)}
            />
          );
        })}
      </RadioGroupMui>
    </FormControl>
  );
}
