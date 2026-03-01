import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import Grid from "@mui/material/Grid";
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
export function FormGrid({ nodeId, nodeType, doc, children, mode, }) {
    const childArray = React.Children.toArray(children);
    const childIds = doc?.nodes?.[nodeId]?.children ?? [];
    const childSpans = childIds.map((cid) => {
        const childNode = doc?.nodes?.[cid];
        return getSpans(childNode?.layout);
    });
    return (_jsx(Grid, { container: true, spacing: 2, "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, children: childArray.map((child, i) => (_jsx(Grid, { item: true, xs: childSpans[i]?.xs ?? 12, md: childSpans[i]?.md ?? 12, children: child }, i))) }));
}
