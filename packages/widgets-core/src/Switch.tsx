import React from "react";
import MuiSwitch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import type { WidgetProps } from "@ai-low-code/renderer";

export function Switch({
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
        <MuiSwitch
          checked={Boolean(value)}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
        />
      }
      label={label ?? ""}
    />
  );
}
