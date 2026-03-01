import { jsx as _jsx } from "react/jsx-runtime";
import TextField from "@mui/material/TextField";
export function TextArea({ nodeId, nodeType, props, value, onChange, disabled, error, label, mode, }) {
    const minRows = typeof props?.minRows === "number" ? props.minRows : 3;
    return (_jsx(TextField, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, fullWidth: true, multiline: true, minRows: minRows, label: label, placeholder: props?.placeholder ?? "", value: value ?? "", onChange: (e) => onChange?.(e.target.value), disabled: disabled, error: error != null && error.length > 0, helperText: error?.[0] }));
}
