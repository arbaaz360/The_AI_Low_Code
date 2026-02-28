import { isExpr } from "./ast.js";
/**
 * Collects all ref.path values from an expression AST.
 * Returns unique paths in stable (deterministic) order.
 */
export function collectDeps(ast) {
    const seen = new Set();
    const order = [];
    walk(ast);
    function walk(node) {
        if (node.op === "ref" && "path" in node && typeof node.path === "string") {
            if (!seen.has(node.path)) {
                seen.add(node.path);
                order.push(node.path);
            }
            return;
        }
        if ("left" in node && node.left != null && isExpr(node.left)) {
            walk(node.left);
        }
        if ("right" in node && node.right != null && isExpr(node.right)) {
            walk(node.right);
        }
        if ("then" in node && node.then != null && isExpr(node.then)) {
            walk(node.then);
        }
        if ("else" in node && node.else != null && isExpr(node.else)) {
            walk(node.else);
        }
        if ("args" in node && Array.isArray(node.args)) {
            for (const arg of node.args) {
                if (isExpr(arg))
                    walk(arg);
            }
        }
    }
    return order;
}
