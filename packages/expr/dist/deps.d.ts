import { type Expr } from "./ast.js";
/**
 * Collects all ref.path values from an expression AST.
 * Returns unique paths in stable (deterministic) order.
 */
export declare function collectDeps(ast: Expr): string[];
//# sourceMappingURL=deps.d.ts.map