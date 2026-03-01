import { jsx as _jsx } from "react/jsx-runtime";
import Box from "@mui/material/Box";
export function Stack({ nodeId, nodeType, props, children, mode, }) {
    const direction = props?.direction === "row" ? "row" : "column";
    return (_jsx(Box, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, sx: { display: "flex", flexDirection: direction, gap: 1 }, children: children }));
}
