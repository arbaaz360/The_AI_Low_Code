import type { FormNode } from "@ai-low-code/engine";
import { mapFieldToWidget } from "@ai-low-code/widgets-core";
import type { DomainField } from "./domainModel.js";

/** Build form.options array for enum from domain field options */
function buildOptionsForEnum(field: DomainField): { value: string; label: string }[] {
  const opts = field.options ?? [];
  return opts.map((o) => ({ value: o, label: o }));
}

/** Create a FormNode from a domain field (for AddNode command) */
export function buildNodeFromDomainField(field: DomainField, uniqueSuffix?: string): FormNode {
  const widgetType = mapFieldToWidget(field);
  const valuePath = `form.values.${field.name}`;
  const displayName = field.displayName ?? field.name;
  const id = uniqueSuffix ? `${field.name}_${uniqueSuffix}` : `${field.name}_${Date.now()}`;

  const node: FormNode = {
    id,
    type: widgetType,
    props: {
      label: displayName,
      ...(widgetType === "core.TextInput" && field.type === "string"
        ? { placeholder: displayName }
        : {}),
    },
    bindings: {
      value: valuePath,
      ...(widgetType === "core.Select" && field.options?.length
        ? { options: `form.options.${field.name}` }
        : {}),
    } as Record<string, unknown>,
    layout: {
      kind: "gridItem",
      span: { xs: 12, md: 6 },
    },
  };

  const validators: { type: string; message?: string; params?: Record<string, unknown> }[] = [];
  if (field.required) {
    validators.push({ type: "required", message: "Required" });
  }
  if (field.maxLength != null && field.type === "string") {
    validators.push({
      type: "maxLength",
      message: `Max ${field.maxLength} characters`,
      params: { value: field.maxLength },
    });
  }
  if (validators.length > 0) {
    node.validation = { validators };
  }

  return node;
}

/** Build form.options initial values for enum fields (for engine) */
export function buildOptionsInitialValues(fields: DomainField[]): Record<string, unknown> {
  const opts: Record<string, { value: string; label: string }[]> = {};
  for (const f of fields) {
    if (f.type === "enum" && f.options?.length) {
      opts[f.name] = buildOptionsForEnum(f);
    }
  }
  return opts;
}
