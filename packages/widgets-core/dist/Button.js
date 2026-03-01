import { jsx as _jsx } from "react/jsx-runtime";
import MuiButton from "@mui/material/Button";
export function Button({ nodeId, nodeType, props, onClick, disabled, label, mode, }) {
    const variant = props?.variant ?? "contained";
    const color = props?.color ?? "primary";
    return (_jsx(MuiButton, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, variant: variant, color: color, disabled: disabled, onClick: () => onClick?.(), children: label ?? "Button" }));
}
