import Ajv from "ajv";
import formDocSchema from "./formdoc.schema.json";
/**
 * Validates a FormDoc against the schema. Returns stable, readable errors.
 */
export function validateFormDoc(doc) {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(formDocSchema);
    const valid = validate(doc);
    if (valid) {
        return { ok: true, errors: [] };
    }
    const errors = (validate.errors ?? []).map(formatError);
    return { ok: false, errors };
}
function formatError(err) {
    const path = err.instancePath ? err.instancePath.slice(1).replace(/\//g, ".") : "";
    const base = err.message ?? "validation failed";
    const params = err.params;
    const extra = params && Object.keys(params).length > 0
        ? ` (${JSON.stringify(params)})`
        : "";
    return { path: path || "(root)", message: `${base}${extra}` };
}
