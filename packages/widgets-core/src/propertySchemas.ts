import type { PropSchema, PropSchemaRegistry } from "@ai-low-code/studio-core";

export const propertySchemas: PropSchemaRegistry = {
  "layout.Section": {
    type: "layout.Section",
    fields: [{ key: "title", label: "Title", type: "string", optional: false, default: "" }],
  },
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
  "core.TextArea": {
    type: "core.TextArea",
    fields: [
      { key: "label", label: "Label", type: "string", optional: false, default: "" },
      { key: "placeholder", label: "Placeholder", type: "string", optional: true },
      { key: "minRows", label: "Min Rows", type: "number", optional: true, default: 3 },
    ],
  },
  "core.NumberInput": {
    type: "core.NumberInput",
    fields: [
      { key: "label", label: "Label", type: "string", optional: false, default: "" },
      { key: "placeholder", label: "Placeholder", type: "string", optional: true },
      { key: "min", label: "Min", type: "number", optional: true },
      { key: "max", label: "Max", type: "number", optional: true },
      { key: "step", label: "Step", type: "number", optional: true },
    ],
  },
  "core.DateInput": {
    type: "core.DateInput",
    fields: [
      { key: "label", label: "Label", type: "string", optional: false, default: "" },
    ],
  },
  "core.Checkbox": {
    type: "core.Checkbox",
    fields: [{ key: "label", label: "Label", type: "string", optional: false, default: "" }],
  },
  "core.Switch": {
    type: "core.Switch",
    fields: [{ key: "label", label: "Label", type: "string", optional: false, default: "" }],
  },
  "core.Select": {
    type: "core.Select",
    fields: [{ key: "label", label: "Label", type: "string", optional: false, default: "" }],
  },
  "core.RadioGroup": {
    type: "core.RadioGroup",
    fields: [{ key: "label", label: "Label", type: "string", optional: false, default: "" }],
  },
  "core.Button": {
    type: "core.Button",
    fields: [
      { key: "label", label: "Label", type: "string", optional: false, default: "Button" },
      {
        key: "variant",
        label: "Variant",
        type: "enum",
        optional: true,
        options: [
          { value: "contained", label: "Contained" },
          { value: "outlined", label: "Outlined" },
          { value: "text", label: "Text" },
        ],
      },
      {
        key: "color",
        label: "Color",
        type: "enum",
        optional: true,
        options: [
          { value: "primary", label: "Primary" },
          { value: "secondary", label: "Secondary" },
          { value: "error", label: "Error" },
          { value: "success", label: "Success" },
        ],
      },
    ],
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

export function getPropSchema(nodeType: string): PropSchema | null {
  return propertySchemas[nodeType] ?? null;
}
