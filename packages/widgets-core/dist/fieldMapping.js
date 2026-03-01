/** Map domain field type to widget type for auto-create */
export function mapFieldToWidget(field) {
    switch (field.type) {
        case "boolean":
            return "core.Checkbox";
        case "enum":
            return "core.Select";
        case "string":
        default:
            return "core.TextInput";
    }
}
