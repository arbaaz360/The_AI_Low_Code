/**
 * TypeScript types for the JSON AST nodes used by the FormDoc schema.
 * Matches packages/schema/src/formdoc.schema.json Expr definition.
 */
/** Type guard: value is an Expr AST node (has op and it's a known op). */
export function isExpr(value) {
    if (value == null || typeof value !== "object")
        return false;
    const obj = value;
    if (typeof obj.op !== "string")
        return false;
    const ops = [
        "lit",
        "ref",
        "eq",
        "neq",
        "gt",
        "gte",
        "lt",
        "lte",
        "and",
        "or",
        "not",
        "if",
        "coalesce",
    ];
    return ops.includes(obj.op);
}
