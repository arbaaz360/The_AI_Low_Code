import React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import type { WidgetProps } from "@ai-low-code/renderer";

function getSpans(layout: Record<string, unknown> | undefined): { xs: number; md: number } {
  if (!layout || typeof layout !== "object") return { xs: 12, md: 12 };
  const span = layout.span as Record<string, number> | undefined;
  if (!span) return { xs: 12, md: 12 };
  const xs = span.xs ?? 12;
  const md = span.md ?? xs;
  return { xs, md };
}

function hasAnyGridItemChild(
  doc: { nodes?: Record<string, { children?: string[]; layout?: Record<string, unknown> }> } | undefined,
  nodeId: string
): boolean {
  const node = doc?.nodes?.[nodeId];
  const childIds = node?.children ?? [];
  return childIds.some((cid) => {
    const child = doc?.nodes?.[cid];
    return (child?.layout as Record<string, unknown> | undefined)?.kind === "gridItem";
  });
}

export function Section({
  nodeId,
  nodeType,
  props,
  doc,
  children,
  mode,
}: WidgetProps) {
  const title = (props?.title as string) ?? "";
  const useGrid = hasAnyGridItemChild(doc, nodeId);
  const childArray = React.Children.toArray(children);
  const childIds = (doc?.nodes?.[nodeId] as { children?: string[] })?.children ?? [];
  const childSpans = childIds.map((cid) => {
    const childNode = doc?.nodes?.[cid] as { layout?: Record<string, unknown> } | undefined;
    return getSpans(childNode?.layout);
  });

  return (
    <Paper
      variant="outlined"
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-nodetype={mode === "design" ? nodeType : undefined}
      sx={{ mb: 2, p: 2, borderRadius: 1.5 }}
    >
      {title && (
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600 }}>
          {title}
        </Typography>
      )}
      {useGrid ? (
        <Grid container spacing={2}>
          {childArray.map((child, i) => (
            <Grid key={i} item xs={childSpans[i]?.xs ?? 12} md={childSpans[i]?.md ?? 12}>
              {child}
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box>{children}</Box>
      )}
    </Paper>
  );
}
