import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MuiSelect from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
export function Select({ nodeId, nodeType, value, onChange, disabled, label, options, mode, }) {
    const opts = Array.isArray(options)
        ? options
        : options && typeof options === "object" && "options" in options
            ? options.options
            : [];
    return (_jsxs(FormControl, { fullWidth: true, disabled: disabled, children: [_jsx(InputLabel, { children: label ?? "" }), _jsx(MuiSelect, { "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, value: value ?? "", onChange: (e) => onChange?.(e.target.value), label: label ?? "", children: opts.map((opt, i) => {
                    const o = typeof opt === "object" && opt && "value" in opt
                        ? opt
                        : { value: opt, label: String(opt) };
                    return (_jsx(MenuItem, { value: o.value, children: o.label ?? String(o.value) }, i));
                }) })] }));
}
