import { jsx as _jsx } from "react/jsx-runtime";
import MuiSwitch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
export function Switch({ nodeId, nodeType, value, onChange, disabled, label, mode, }) {
    return (_jsx(FormControlLabel, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, control: _jsx(MuiSwitch, { checked: Boolean(value), onChange: (e) => onChange?.(e.target.checked), disabled: disabled }), label: label ?? "" }));
}
