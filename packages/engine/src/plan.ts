import { collectDeps, isExpr, type Expr } from "@ai-low-code/expr";
import type { FormDoc, FormNode, FormRule } from "./types.js";

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
export function buildEvalPlan(formDoc: FormDoc): EvalPlan {
  const targets: EvalTarget[] = [];
  const depToExprIds = new Map<string, Set<string>>();
  const exprIdToTarget = new Map<string, EvalTarget>();

  function addTarget(nodeId: string, kind: ExprKind, ast: Expr, suffix: string): void {
    const exprId = `${kind}:${nodeId}:${suffix}`;
    const target: EvalTarget = { exprId, nodeId, kind, ast };
    targets.push(target);
    exprIdToTarget.set(exprId, target);

    const deps = collectDeps(ast);
    for (const dep of deps) {
      let set = depToExprIds.get(dep);
      if (!set) {
        set = new Set();
        depToExprIds.set(dep, set);
      }
      set.add(exprId);
    }
  }

  for (const [nodeId, node] of Object.entries(formDoc.nodes)) {
    const bindings = node?.bindings;
    if (bindings?.visible && isExpr(bindings.visible)) {
      addTarget(nodeId, "visibility", bindings.visible as Expr, "binding");
    }
    if (bindings?.disabled && isExpr(bindings.disabled)) {
      addTarget(nodeId, "disabled", bindings.disabled as Expr, "binding");
    }
  }

  const rules = formDoc.rules ?? [];
  for (const rule of rules) {
    if ((rule.type === "visibility" || rule.type === "disabled") && rule.expr && isExpr(rule.expr)) {
      const nodeId = rule.target;
      addTarget(nodeId, rule.type as ExprKind, rule.expr, `rule:${rule.id}`);
    }
  }

  return { targets, depToExprIds, exprIdToTarget };
}
