import { isExpr } from "./ast.js";
/**
 * Evaluates an expression AST against a context.
 * ctx.get(path) returns the value for refs; missing refs yield undefined (no throw).
 * Comparisons with null/undefined are well-defined; boolean ops short-circuit; coalesce returns first non-null/undefined.
 */
export function evalAst(ast, ctx) {
    switch (ast.op) {
        case "lit":
            return ast.value;
        case "ref": {
            const path = ast.path;
            return ctx.get(path);
        }
        case "eq":
        case "neq":
        case "gt":
        case "gte":
        case "lt":
        case "lte": {
            const bin = ast;
            const a = evalAst(bin.left, ctx);
            const b = evalAst(bin.right, ctx);
            return compare(ast.op, a, b);
        }
        case "and": {
            const andLeft = ast.left;
            const andArgs = ast.args;
            const andOperands = andArgs ?? (andLeft != null ? [andLeft, ast.right].filter(isExpr) : []);
            for (const o of andOperands) {
                const v = evalAst(o, ctx);
                if (!toBool(v))
                    return false;
            }
            return true;
        }
        case "or": {
            const orLeft = ast.left;
            const orArgs = ast.args;
            const orOperands = orArgs ?? (orLeft != null ? [orLeft, ast.right].filter(isExpr) : []);
            for (const o of orOperands) {
                const v = evalAst(o, ctx);
                if (toBool(v))
                    return true;
            }
            return false;
        }
        case "not": {
            const notArg = ast.args?.[0] ?? ast.left;
            return !toBool(notArg != null ? evalAst(notArg, ctx) : undefined);
        }
        case "if": {
            const cond = ast;
            const condVal = evalAst(cond.left, ctx);
            return toBool(condVal) ? evalAst(cond.then, ctx) : evalAst(cond.else, ctx);
        }
        case "coalesce": {
            const args = ast.args;
            for (const a of args) {
                const v = evalAst(a, ctx);
                if (v != null)
                    return v;
            }
            return undefined;
        }
        default:
            return undefined;
    }
}
function toBool(v) {
    if (v === undefined || v === null)
        return false;
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return !Number.isNaN(v) && v !== 0;
    if (typeof v === "string")
        return v.length > 0;
    return true;
}
function compare(op, a, b) {
    if (op === "eq")
        return looseEq(a, b);
    if (op === "neq")
        return !looseEq(a, b);
    const cmp = compareValues(a, b);
    if (cmp === undefined)
        return false;
    switch (op) {
        case "gt":
            return cmp > 0;
        case "gte":
            return cmp >= 0;
        case "lt":
            return cmp < 0;
        case "lte":
            return cmp <= 0;
        default:
            return false;
    }
}
function looseEq(a, b) {
    if (a === b)
        return true;
    if (a == null || b == null)
        return a == null && b == null;
    if (typeof a === "number" && typeof b === "number")
        return a === b && !(Number.isNaN(a) || Number.isNaN(b));
    if (typeof a === "string" && typeof b === "string")
        return a === b;
    if (typeof a === "boolean" && typeof b === "boolean")
        return a === b;
    return false;
}
function compareValues(a, b) {
    if (a == null || b == null)
        return undefined;
    if (typeof a === "number" && typeof b === "number") {
        if (Number.isNaN(a) || Number.isNaN(b))
            return undefined;
        return a - b;
    }
    if (typeof a === "string" && typeof b === "string") {
        return a.localeCompare(b);
    }
    if (typeof a === "number" && typeof b === "string")
        return compareValues(a, Number(b));
    if (typeof a === "string" && typeof b === "number")
        return compareValues(Number(a), b);
    return undefined;
}
