import { collectDeps, isExpr } from "@ai-low-code/expr";
/**
 * Builds the evaluation plan from FormDoc.
 * Lives outside Redux state.
 */
export function buildEvalPlan(formDoc) {
    const targets = [];
    const depToExprIds = new Map();
    const exprIdToTarget = new Map();
    function addTarget(nodeId, kind, ast, suffix) {
        const exprId = `${kind}:${nodeId}:${suffix}`;
        const target = { exprId, nodeId, kind, ast };
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
            addTarget(nodeId, "visibility", bindings.visible, "binding");
        }
        if (bindings?.disabled && isExpr(bindings.disabled)) {
            addTarget(nodeId, "disabled", bindings.disabled, "binding");
        }
    }
    const rules = formDoc.rules ?? [];
    for (const rule of rules) {
        if ((rule.type === "visibility" || rule.type === "disabled") && rule.expr && isExpr(rule.expr)) {
            const nodeId = rule.target;
            addTarget(nodeId, rule.type, rule.expr, `rule:${rule.id}`);
        }
    }
    return { targets, depToExprIds, exprIdToTarget };
}
