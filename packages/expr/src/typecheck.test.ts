import { describe, it, expect } from "vitest";
import { typeCheckAst } from "./typecheck.js";
import type { Expr } from "./ast.js";

describe("typeCheckAst", () => {
  it("ok for lit and ref", () => {
    expect(typeCheckAst({ op: "lit", value: 1 })).toEqual({ ok: true, warnings: [] });
    expect(typeCheckAst({ op: "ref", path: "x" })).toEqual({ ok: true, warnings: [] });
  });

  it("ok for eq with same-type literals", () => {
    const ast: Expr = {
      op: "eq",
      left: { op: "lit", value: 1 },
      right: { op: "lit", value: 2 },
    };
    expect(typeCheckAst(ast).ok).toBe(true);
  });

  it("warns for compare ops with mismatched types", () => {
    const ast: Expr = {
      op: "eq",
      left: { op: "lit", value: 1 },
      right: { op: "lit", value: "hello" },
    };
    const r = typeCheckAst(ast);
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.message.includes("Compare op eq"))).toBe(true);
  });

  it("warns for and/or with non-boolean operand", () => {
    const ast: Expr = {
      op: "and",
      left: { op: "lit", value: 5 },
      right: { op: "lit", value: true },
    };
    const r = typeCheckAst(ast);
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.message.includes("expects boolean-ish"))).toBe(true);
  });

  it("warns for not with non-boolean operand", () => {
    const ast: Expr = { op: "not", args: [{ op: "lit", value: "x" }] };
    const r = typeCheckAst(ast);
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.message.includes("not expects boolean-ish"))).toBe(true);
  });

  it("warns for if condition with non-boolean", () => {
    const ast: Expr = {
      op: "if",
      left: { op: "lit", value: 42 },
      then: { op: "lit", value: "a" },
      else: { op: "lit", value: "b" },
    };
    const r = typeCheckAst(ast);
    expect(r.ok).toBe(false);
    expect(r.warnings.some((w) => w.message.includes("if condition"))).toBe(true);
  });

  it("ok for compare with ref (any)", () => {
    const ast: Expr = {
      op: "eq",
      left: { op: "ref", path: "a" },
      right: { op: "lit", value: 1 },
    };
    expect(typeCheckAst(ast).ok).toBe(true);
  });
});
