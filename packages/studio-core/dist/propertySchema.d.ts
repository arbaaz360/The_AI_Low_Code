/**
 * Property schema for Inspector auto-generation.
 * Each field describes an editable prop for a widget type.
 */
export interface PropSchemaField {
    key: string;
    label: string;
    type: "string" | "number" | "enum";
    optional?: boolean;
    default?: unknown;
    /** For type "enum": allowed values */
    options?: {
        value: string;
        label: string;
    }[];
}
export interface PropSchema {
    type: string;
    fields: PropSchemaField[];
}
/**
 * Registry of property schemas by widget type.
 * Keys are widget type strings (e.g. "core.Section", "core.TextInput").
 */
export type PropSchemaRegistry = Record<string, PropSchema>;
//# sourceMappingURL=propertySchema.d.ts.map