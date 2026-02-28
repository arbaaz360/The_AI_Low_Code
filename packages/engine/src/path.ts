/**
 * Get nested value by dot path. Returns undefined if any segment missing.
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (path === "" || obj == null) return undefined;
  const parts = path.split(".");
  let v: unknown = obj;
  for (const p of parts) {
    if (v == null || typeof v !== "object") return undefined;
    v = (v as Record<string, unknown>)[p];
  }
  return v;
}

/**
 * Set nested value by dot path. Mutates obj.
 */
export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = current[key];
    if (next == null || typeof next !== "object") {
      current[key] = {};
      current = current[key] as Record<string, unknown>;
    } else {
      current = next as Record<string, unknown>;
    }
  }
  current[parts[parts.length - 1]!] = value;
}
