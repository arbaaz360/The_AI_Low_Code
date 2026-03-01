import { jsx as _jsx } from "react/jsx-runtime";
import TextField from "@mui/material/TextField";
export function NumberInput({ nodeId, nodeType, props, value, onChange, disabled, error, label, mode, }) {
    const handleChange = (e) => {
        const raw = e.target.value;
        if (raw === "") {
            onChange?.("");
            return;
        }
        const num = Number(raw);
        onChange?.(Number.isNaN(num) ? raw : num);
    };
    return (_jsx(TextField, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, fullWidth: true, type: "number", label: label, placeholder: props?.placeholder ?? "", value: value ?? "", onChange: handleChange, disabled: disabled, error: error != null && error.length > 0, helperText: error?.[0], inputProps: {
            min: props?.min,
            max: props?.max,
            step: props?.step,
        } }));
}
