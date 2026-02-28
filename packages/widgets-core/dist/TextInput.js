import { jsx as _jsx } from "react/jsx-runtime";
import TextField from "@mui/material/TextField";
export function TextInput({ nodeId, nodeType, value, onChange, disabled, error, label, mode, }) {
    return (_jsx(TextField, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, fullWidth: true, label: label, value: value ?? "", onChange: (e) => onChange?.(e.target.value), disabled: disabled, error: error != null && error.length > 0, helperText: error?.[0] }));
}
