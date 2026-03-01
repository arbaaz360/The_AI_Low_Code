import React from "react";
import Grid from "@mui/material/Grid";
import type { WidgetProps } from "@ai-low-code/renderer";

function getSpans(layout: Record<string, unknown> | undefined): { xs: number; md: number } {
  if (!layout || typeof layout !== "object") return { xs: 12, md: 12 };
  const span = layout.span as Record<string, number> | undefined;
  if (!span) return { xs: 12, md: 12 };
  const xs = span.xs ?? 12;
  const md = span.md ?? xs;
  return { xs, md };
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
  const childSpans = childIds.map((cid) => {
    const childNode = doc?.nodes?.[cid] as { layout?: Record<string, unknown> } | undefined;
    return getSpans(childNode?.layout);
  });

  return (
    <Grid
      container
      spacing={2}
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
    >
      {childArray.map((child, i) => (
        <Grid key={i} item xs={childSpans[i]?.xs ?? 12} md={childSpans[i]?.md ?? 12}>
          {child}
        </Grid>
      ))}
    </Grid>
  );
}
