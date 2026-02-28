/**
 * Get nested value by dot path. Returns undefined if any segment missing.
 */
export function getByPath(obj, path) {
    if (path === "" || obj == null)
        return undefined;
    const parts = path.split(".");
    let v = obj;
    for (const p of parts) {
        if (v == null || typeof v !== "object")
            return undefined;
        v = v[p];
    }
    return v;
}
/**
 * Set nested value by dot path. Mutates obj.
 */
export function setByPath(obj, path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const next = current[key];
        if (next == null || typeof next !== "object") {
            current[key] = {};
            current = current[key];
        }
        else {
            current = next;
        }
    }
    current[parts[parts.length - 1]] = value;
}
