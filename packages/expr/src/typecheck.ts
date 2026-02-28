import { isExpr, type Expr } from "./ast.js";

export interface TypeCheckResult {
  ok: boolean;
  warnings: { path?: string; message: string }[];
}

/**
 * Lightweight type checks for expression AST.
 * and/or/not expect boolean-ish; compare ops expect comparable types.
 * Returns warnings for obvious mismatches. Not full inference.
 */
export function typeCheckAst(ast: Expr, pathPrefix = ""): TypeCheckResult {
  const warnings: { path?: string; message: string }[] = [];
  walk(ast, pathPrefix);
  return { ok: warnings.length === 0, warnings };

  function path(p: string): string {
    return pathPrefix ? `${pathPrefix}.${p}` : p;
  }

  function walk(node: Expr, p: string): void {
    switch (node.op) {
      case "lit":
      case "ref":
        break;

      case "eq":
      case "neq":
      case "gt":
      case "gte":
      case "lt":
      case "lte": {
        const bin = node as { left: Expr; right: Expr };
        const leftType = inferHint(bin.left);
        const rightType = inferHint(bin.right);
        if (leftType !== "any" && rightType !== "any" && leftType !== rightType) {
          warnings.push({
            path: p,
            message: `Compare op ${node.op}: left is ${leftType}, right is ${rightType}`,
          });
        }
        walk(bin.left, path("left"));
        walk(bin.right, path("right"));
        break;
      }

      case "and":
      case "or": {
        const bin = node as { left?: Expr; right?: Expr; args?: Expr[] };
        const operands = bin.args ?? [bin.left, bin.right].filter(isExpr);
        for (let i = 0; i < operands.length; i++) {
          const op = operands[i]!;
          const t = inferHint(op);
          if (t !== "any" && t !== "boolean") {
            warnings.push({
              path: path(`args[${i}]`),
              message: `${node.op} expects boolean-ish, got ${t}`,
            });
          }
          walk(op, path(`args[${i}]`));
        }
        break;
      }

      case "not": {
        const notNode = node as { left?: Expr; args?: Expr[] };
        const arg = notNode.args?.[0] ?? notNode.left;
        if (arg) {
          const t = inferHint(arg);
          if (t !== "any" && t !== "boolean") {
            warnings.push({
              path: path("arg"),
              message: `not expects boolean-ish, got ${t}`,
            });
          }
          walk(arg, path("arg"));
        }
        break;
      }

      case "if": {
        const ifNode = node as { left: Expr; then: Expr; else: Expr };
        const condType = inferHint(ifNode.left);
        if (condType !== "any" && condType !== "boolean") {
          warnings.push({
            path: path("left"),
            message: `if condition expects boolean-ish, got ${condType}`,
          });
        }
        walk(ifNode.left, path("left"));
        walk(ifNode.then, path("then"));
        walk(ifNode.else, path("else"));
        break;
      }

      case "coalesce": {
        const args = (node as { args: Expr[] }).args ?? [];
        for (let i = 0; i < args.length; i++) {
          walk(args[i]!, path(`args[${i}]`));
        }
        break;
      }
    }
  }

  function inferHint(expr: Expr): "any" | "boolean" | "number" | "string" {
    if (expr.op === "lit") {
      const v = (expr as { value: unknown }).value;
      if (typeof v === "boolean") return "boolean";
      if (typeof v === "number") return "number";
      if (typeof v === "string") return "string";
      return "any";
    }
    if (expr.op === "ref") return "any";
    if (expr.op === "and" || expr.op === "or" || expr.op === "not" || expr.op === "eq" || expr.op === "neq" ||
        expr.op === "gt" || expr.op === "gte" || expr.op === "lt" || expr.op === "lte") {
      return "boolean";
    }
    if (expr.op === "if" || expr.op === "coalesce") return "any";
    return "any";
  }
}
