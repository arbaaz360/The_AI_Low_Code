import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import type { Diagnostic } from "@ai-low-code/studio-core";

interface DiagnosticsPanelProps {
  errors: Diagnostic[];
  warnings: Diagnostic[];
  onSelectNode?: (nodeId: string) => void;
}

function DiagnosticItem({
  d,
  onSelectNode,
}: {
  d: Diagnostic;
  onSelectNode?: (nodeId: string) => void;
}) {
  const handleClick = () => {
    if (d.nodeId && onSelectNode) {
      onSelectNode(d.nodeId);
    }
  };

  const secondary = d.nodeId ? `${d.code} • ${d.nodeId}` : d.code;

  return (
    <ListItemButton
      onClick={handleClick}
      disabled={!d.nodeId}
      data-testid={d.nodeId ? `diagnostic-${d.nodeId}` : undefined}
      sx={{
        borderLeft: 3,
        borderColor: d.severity === "error" ? "error.main" : "warning.main",
        bgcolor: d.severity === "error" ? "rgba(211, 47, 47, 0.08)" : "rgba(237, 108, 2, 0.08)",
        "&.Mui-disabled": { opacity: 0.8 },
      }}
    >
      <ListItemText
        primary={d.message}
        secondary={secondary}
        primaryTypographyProps={{ variant: "body2" }}
        secondaryTypographyProps={{ variant: "caption" }}
      />
    </ListItemButton>
  );
}

export function DiagnosticsPanel({
  errors,
  warnings,
  onSelectNode,
}: DiagnosticsPanelProps) {
  const hasAny = errors.length > 0 || warnings.length > 0;
  if (!hasAny) return null;

  return (
    <Box data-testid="diagnostics-panel" sx={{ borderTop: 1, borderColor: "divider" }}>
      <Typography variant="subtitle2" sx={{ px: 2, pt: 1, color: "text.secondary" }}>
        Diagnostics
      </Typography>
      <List dense disablePadding>
        {errors.map((d, i) => (
          <DiagnosticItem key={`e-${i}`} d={d} onSelectNode={onSelectNode} />
        ))}
        {warnings.map((d, i) => (
          <DiagnosticItem key={`w-${i}`} d={d} onSelectNode={onSelectNode} />
        ))}
      </List>
    </Box>
  );
}
