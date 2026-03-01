const SPAN_MIN = 1;
const SPAN_MAX = 12;
/**
 * Clamps a span value to valid range 1..12.
 */
export function clampSpan(value) {
    return Math.round(Math.max(SPAN_MIN, Math.min(SPAN_MAX, value)));
}
/**
 * Validates layout.span for gridItem nodes. Returns diagnostics for invalid values.
 * Does not mutate. Use for surfacing warnings on existing doc.
 */
export function validateLayoutSpan(nodeId, layout) {
    const diagnostics = [];
    if (!layout || typeof layout !== "object")
        return diagnostics;
    const span = layout.span;
    if (!span)
        return diagnostics;
    for (const key of ["xs", "md"]) {
        const val = span[key];
        if (val === undefined || val === null)
            continue;
        const n = Number(val);
        if (!Number.isInteger(n) || n < SPAN_MIN || n > SPAN_MAX) {
            diagnostics.push({
                code: "LAYOUT_SPAN_INVALID",
                message: `layout.span.${key} must be 1-12 (got ${val})`,
                severity: "warn",
                nodeId,
                path: `nodes.${nodeId}.layout.span.${key}`,
            });
        }
    }
    return diagnostics;
}
