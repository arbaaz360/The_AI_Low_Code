import { type Expr } from "./ast.js";
export interface TypeCheckResult {
    ok: boolean;
    warnings: {
        path?: string;
        message: string;
    }[];
}
/**
 * Lightweight type checks for expression AST.
 * and/or/not expect boolean-ish; compare ops expect comparable types.
 * Returns warnings for obvious mismatches. Not full inference.
 */
export declare function typeCheckAst(ast: Expr, pathPrefix?: string): TypeCheckResult;
//# sourceMappingURL=typecheck.d.ts.map