export const CANONICAL_WIDGET_TYPES = new Set([
    "layout.FormGrid",
    "layout.Section",
    "layout.Stack",
    "core.TextInput",
    "core.TextArea",
    "core.NumberInput",
    "core.DateInput",
    "core.Checkbox",
    "core.Switch",
    "core.Select",
    "core.RadioGroup",
    "core.Button",
]);
export const LEGACY_WIDGET_ALIASES = {
    FormGrid: "layout.FormGrid",
    Section: "layout.Section",
    "core.Section": "layout.Section",
    Stack: "layout.Stack",
};
export const ALLOWED_ACTION_TYPES = new Set([
    "SetValue",
    "ValidateForm",
    "Toast",
    "Navigate",
    "Batch",
    "If",
    "CallDataSource",
    "SetData",
    "SubmitForm",
]);
export const ALLOWED_EVENT_NAMES = new Set(["onChange", "onClick", "onBlur"]);
export const ALLOWED_SETVALUE_PATH_PREFIXES = ["form.values.", "ui."];
export const ALLOWED_VALUE_BINDING_PREFIX = "form.values.";
export const ALLOWED_OPTIONS_BINDING_PREFIXES = ["data.byKey.", "form.options."];
export const ALLOWED_EXPR_OPS = new Set([
    "lit", "ref", "eq", "neq", "gt", "gte", "lt", "lte",
    "and", "or", "not", "if", "coalesce",
]);
export const KNOWN_PROP_KEYS = {
    "layout.Section": new Set(["title"]),
    "layout.FormGrid": new Set(["columns"]),
    "layout.Stack": new Set(["direction"]),
    "core.TextInput": new Set(["label", "placeholder"]),
    "core.TextArea": new Set(["label", "placeholder", "minRows"]),
    "core.NumberInput": new Set(["label", "placeholder", "min", "max", "step"]),
    "core.DateInput": new Set(["label"]),
    "core.Checkbox": new Set(["label"]),
    "core.Switch": new Set(["label"]),
    "core.Select": new Set(["label", "options"]),
    "core.RadioGroup": new Set(["label", "options"]),
    "core.Button": new Set(["label", "variant", "color"]),
};
export const MAX_EXPR_DEPTH = 20;
export const MAX_EXPR_NODE_COUNT = 200;
export const MAX_NODES = 500;
export const MAX_DOC_BYTES = 2_000_000;
