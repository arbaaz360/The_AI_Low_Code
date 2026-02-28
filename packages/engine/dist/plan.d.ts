import { type Expr } from "@ai-low-code/expr";
import type { FormDoc } from "./types.js";
export type ExprKind = "visibility" | "disabled";
export interface EvalTarget {
    exprId: string;
    nodeId: string;
    kind: ExprKind;
    ast: Expr;
}
export interface EvalPlan {
    targets: EvalTarget[];
    /** depPath -> exprIds that depend on it */
    depToExprIds: Map<string, Set<string>>;
    /** exprId -> target */
    exprIdToTarget: Map<string, EvalTarget>;
}
/**
 * Builds the evaluation plan from FormDoc.
 * Lives outside Redux state.
 */
export declare function buildEvalPlan(formDoc: FormDoc): EvalPlan;
//# sourceMappingURL=plan.d.ts.map