import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import Grid from "@mui/material/Grid";
function getSpan(layout) {
    if (!layout || typeof layout !== "object")
        return 12;
    const span = layout.span;
    if (!span)
        return 12;
    return (span.xs ?? span.md ?? 12);
}
export function FormGrid({ nodeId, nodeType, doc, children, mode, }) {
    const childArray = React.Children.toArray(children);
    const childIds = doc?.nodes?.[nodeId]?.children ?? [];
    const spans = childIds.map((cid) => {
        const childNode = doc?.nodes?.[cid];
        return getSpan(childNode?.layout);
    });
    return (_jsx(Grid, { container: true, spacing: 2, "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, children: childArray.map((child, i) => (_jsx(Grid, { item: true, xs: spans[i] ?? 12, md: spans[i] ?? 12, children: child }, i))) }));
}
