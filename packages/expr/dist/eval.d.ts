import { type Expr } from "./ast.js";
export interface EvalContext {
    get(path: string): unknown;
}
/**
 * Evaluates an expression AST against a context.
 * ctx.get(path) returns the value for refs; missing refs yield undefined (no throw).
 * Comparisons with null/undefined are well-defined; boolean ops short-circuit; coalesce returns first non-null/undefined.
 */
export declare function evalAst(ast: Expr, ctx: EvalContext): unknown;
//# sourceMappingURL=eval.d.ts.map