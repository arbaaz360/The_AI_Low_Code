/** Minimal field shape from domain model (design-time) */
export interface DomainFieldLike {
  type: string;
  name: string;
  displayName?: string;
  required?: boolean;
  maxLength?: number;
  options?: string[];
}

/** Map domain field type to widget type for auto-create */
export function mapFieldToWidget(field: DomainFieldLike): string {
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
