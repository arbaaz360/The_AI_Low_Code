/**
 * TypeScript types for the JSON AST nodes used by the FormDoc schema.
 * Matches packages/schema/src/formdoc.schema.json Expr definition.
 */

export type ExprOp =
  | "lit"
  | "ref"
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "and"
  | "or"
  | "not"
  | "if"
  | "coalesce";

export interface ExprBase {
  op: ExprOp;
}

export interface LitExpr extends ExprBase {
  op: "lit";
  value: unknown;
}

export interface RefExpr extends ExprBase {
  op: "ref";
  path: string;
}

export interface BinaryExpr extends ExprBase {
  op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "and" | "or";
  left: Expr;
  right?: Expr;
  args?: Expr[];
}

export interface NotExpr extends ExprBase {
  op: "not";
  left?: Expr;
  args?: Expr[];
}

export interface IfExpr extends ExprBase {
  op: "if";
  left: Expr;
  then: Expr;
  else: Expr;
  args?: Expr[];
}

export interface CoalesceExpr extends ExprBase {
  op: "coalesce";
  args: Expr[];
}

export type Expr =
  | LitExpr
  | RefExpr
  | BinaryExpr
  | NotExpr
  | IfExpr
  | CoalesceExpr;

/** Type guard: value is an Expr AST node (has op and it's a known op). */
export function isExpr(value: unknown): value is Expr {
  if (value == null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.op !== "string") return false;
  const ops: ExprOp[] = [
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
  return ops.includes(obj.op as ExprOp);
}
