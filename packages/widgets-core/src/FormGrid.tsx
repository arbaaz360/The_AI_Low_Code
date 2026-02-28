import React from "react";
import Grid from "@mui/material/Grid";
import type { WidgetProps } from "@ai-low-code/renderer";

function getSpan(layout: Record<string, unknown> | undefined): number {
  if (!layout || typeof layout !== "object") return 12;
  const span = layout.span as Record<string, number> | undefined;
  if (!span) return 12;
  return (span.xs ?? span.md ?? 12) as number;
}

export function FormGrid({
  nodeId,
  nodeType,
  doc,
  children,
  mode,
}: WidgetProps) {
  const childArray = React.Children.toArray(children);
  const childIds = (doc?.nodes?.[nodeId] as { children?: string[] })?.children ?? [];
  const spans = childIds.map((cid) => {
    const childNode = doc?.nodes?.[cid] as { layout?: Record<string, unknown> } | undefined;
    return getSpan(childNode?.layout);
  });

  return (
    <Grid
      container
      spacing={2}
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
    >
      {childArray.map((child, i) => (
        <Grid key={i} item xs={spans[i] ?? 12} md={spans[i] ?? 12}>
          {child}
        </Grid>
      ))}
    </Grid>
  );
}
