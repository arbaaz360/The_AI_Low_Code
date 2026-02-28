import Ajv, { type ErrorObject } from "ajv";
import formDocSchema from "./formdoc.schema.json";

export interface ValidationResult {
  ok: boolean;
  errors: { path: string; message: string }[];
}

/**
 * Validates a FormDoc against the schema. Returns stable, readable errors.
 */
export function validateFormDoc(doc: unknown): ValidationResult {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(formDocSchema as object);

  const valid = validate(doc);

  if (valid) {
    return { ok: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map(formatError);

  return { ok: false, errors };
}

function formatError(err: ErrorObject): { path: string; message: string } {
  const path = err.instancePath ? err.instancePath.slice(1).replace(/\//g, ".") : "";
  const base = err.message ?? "validation failed";
  const params = err.params as Record<string, unknown> | undefined;
  const extra =
    params && Object.keys(params).length > 0
      ? ` (${JSON.stringify(params)})`
      : "";
  return { path: path || "(root)", message: `${base}${extra}` };
}
