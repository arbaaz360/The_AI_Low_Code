import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
export function Section({ nodeId, nodeType, props, children, mode, }) {
    const title = props?.title ?? "";
    return (_jsxs(Box, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, sx: { mb: 2 }, children: [title && (_jsx(Typography, { variant: "h6", sx: { mb: 1 }, children: title })), _jsx(Box, { children: children })] }));
}
