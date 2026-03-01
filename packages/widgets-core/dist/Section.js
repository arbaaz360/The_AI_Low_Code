import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
function getSpans(layout) {
    if (!layout || typeof layout !== "object")
        return { xs: 12, md: 12 };
    const span = layout.span;
    if (!span)
        return { xs: 12, md: 12 };
    const xs = span.xs ?? 12;
    const md = span.md ?? xs;
    return { xs, md };
}
function hasAnyGridItemChild(doc, nodeId) {
    const node = doc?.nodes?.[nodeId];
    const childIds = node?.children ?? [];
    return childIds.some((cid) => {
        const child = doc?.nodes?.[cid];
        return child?.layout?.kind === "gridItem";
    });
}
export function Section({ nodeId, nodeType, props, doc, children, mode, }) {
    const title = props?.title ?? "";
    const useGrid = hasAnyGridItemChild(doc, nodeId);
    const childArray = React.Children.toArray(children);
    const childIds = doc?.nodes?.[nodeId]?.children ?? [];
    const childSpans = childIds.map((cid) => {
        const childNode = doc?.nodes?.[cid];
        return getSpans(childNode?.layout);
    });
    return (_jsxs(Paper, { variant: "outlined", "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, sx: { mb: 2, p: 2, borderRadius: 1.5 }, children: [title && (_jsx(Typography, { variant: "subtitle1", sx: { mb: 1.5, fontWeight: 600 }, children: title })), useGrid ? (_jsx(Grid, { container: true, spacing: 2, children: childArray.map((child, i) => (_jsx(Grid, { item: true, xs: childSpans[i]?.xs ?? 12, md: childSpans[i]?.md ?? 12, children: child }, i))) })) : (_jsx(Box, { children: children }))] }));
}
