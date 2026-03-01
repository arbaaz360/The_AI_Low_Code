import React from "react";
import MuiCheckbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Checkbox({
  nodeId,
  nodeType,
  value,
  onChange,
  disabled,
  label,
  mode,
}: WidgetProps) {
  return (
    <FormControlLabel
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      control={
        <MuiCheckbox
          checked={Boolean(value)}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
        />
      }
      label={label ?? ""}
    />
  );
}
