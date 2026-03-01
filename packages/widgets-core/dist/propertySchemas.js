/** Property schemas for Inspector (minimal v1) */
export const propertySchemas = {
    "core.Section": {
        type: "core.Section",
        fields: [{ key: "title", label: "Title", type: "string", optional: false, default: "" }],
    },
    Section: {
        type: "Section",
        fields: [{ key: "title", label: "Title", type: "string", optional: false, default: "" }],
    },
    "core.TextInput": {
        type: "core.TextInput",
        fields: [
            { key: "label", label: "Label", type: "string", optional: false, default: "" },
            { key: "placeholder", label: "Placeholder", type: "string", optional: true },
        ],
    },
    "core.Checkbox": {
        type: "core.Checkbox",
        fields: [{ key: "label", label: "Label", type: "string", optional: false, default: "" }],
    },
    "core.Select": {
        type: "core.Select",
        fields: [{ key: "label", label: "Label", type: "string", optional: false, default: "" }],
    },
    "layout.Stack": {
        type: "layout.Stack",
        fields: [
            {
                key: "direction",
                label: "Direction",
                type: "enum",
                optional: true,
                options: [
                    { value: "row", label: "Row" },
                    { value: "col", label: "Column" },
                ],
            },
        ],
    },
    Stack: {
        type: "Stack",
        fields: [
            {
                key: "direction",
                label: "Direction",
                type: "enum",
                optional: true,
                options: [
                    { value: "row", label: "Row" },
                    { value: "col", label: "Column" },
                ],
            },
        ],
    },
};
export function getPropSchema(nodeType) {
    return propertySchemas[nodeType] ?? null;
}
