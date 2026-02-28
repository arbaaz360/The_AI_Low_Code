import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MuiRadio from "@mui/material/Radio";
import RadioGroupMui from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import FormControlLabel from "@mui/material/FormControlLabel";
export function RadioGroup({ nodeId, nodeType, value, onChange, disabled, label, options, mode, }) {
    const opts = Array.isArray(options)
        ? options
        : options && typeof options === "object" && "options" in options
            ? options.options
            : [];
    return (_jsxs(FormControl, { disabled: disabled, children: [_jsx(FormLabel, { children: label ?? "" }), _jsx(RadioGroupMui, { value: value ?? "", onChange: (e) => onChange?.(e.target.value), "data-nodeid": mode === "design" ? nodeId : undefined, "data-nodetype": mode === "design" ? nodeType : undefined, children: opts.map((opt, i) => {
                    const o = typeof opt === "object" && opt && "value" in opt
                        ? opt
                        : { value: opt, label: String(opt) };
                    return (_jsx(FormControlLabel, { value: o.value, control: _jsx(MuiRadio, {}), label: o.label ?? String(o.value) }, i));
                }) })] }));
}
