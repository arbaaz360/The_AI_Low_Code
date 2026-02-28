export type {
  Expr,
  ExprOp,
  LitExpr,
  RefExpr,
  BinaryExpr,
  NotExpr,
  IfExpr,
  CoalesceExpr,
} from "./ast.js";
export { isExpr } from "./ast.js";
export { collectDeps } from "./deps.js";
export { evalAst, type EvalContext } from "./eval.js";
export { typeCheckAst, type TypeCheckResult } from "./typecheck.js";
