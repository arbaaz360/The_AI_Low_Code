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
      return "core.Checkbox";
    case "enum":
      return "core.Select";
    case "string":
    default:
      return "core.TextInput";
  }
}
