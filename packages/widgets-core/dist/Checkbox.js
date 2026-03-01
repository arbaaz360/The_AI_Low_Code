import { jsx as _jsx } from "react/jsx-runtime";
import MuiCheckbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
export function Checkbox({ nodeId, nodeType, value, onChange, disabled, label, mode, }) {
    return (_jsx(FormControlLabel, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, control: _jsx(MuiCheckbox, { checked: Boolean(value), onChange: (e) => onChange?.(e.target.checked), disabled: disabled }), label: label ?? "" }));
}
