/** Map domain field type to widget type for auto-create */
export function mapFieldToWidget(field) {
    switch (field.type) {
        case "boolean":
            return "core.Switch";
        case "enum":
            return "core.Select";
        case "date":
            return "core.DateInput";
        case "number":
        case "integer":
            return "core.NumberInput";
        case "string":
        default:
            if (field.maxLength != null && field.maxLength > 200) {
                return "core.TextArea";
            }
            return "core.TextInput";
    }
}
