import { describe, it, expect } from "vitest";
import { collectDeps } from "./deps.js";
import type { Expr } from "./ast.js";

describe("collectDeps", () => {
  it("collects ref.path from single ref", () => {
    const ast: Expr = { op: "ref", path: "form.values.x" };
    expect(collectDeps(ast)).toEqual(["form.values.x"]);
  });

  it("collects refs from nested AST (eq)", () => {
    const ast: Expr = {
      op: "eq",
      left: { op: "ref", path: "form.values.a" },
      right: { op: "ref", path: "form.values.b" },
    };
    expect(collectDeps(ast)).toEqual(["form.values.a", "form.values.b"]);
  });

  it("deduplicates refs", () => {
    const ast: Expr = {
      op: "and",
      left: { op: "ref", path: "form.values.x" },
      right: {
        op: "eq",
        left: { op: "ref", path: "form.values.x" },
        right: { op: "lit", value: 1 },
      },
    };
    expect(collectDeps(ast)).toEqual(["form.values.x"]);
  });

  it("returns stable order (deterministic)", () => {
    const ast: Expr = {
      op: "and",
      args: [
        { op: "ref", path: "z" },
        { op: "ref", path: "a" },
        { op: "ref", path: "m" },
      ],
    };
    const result = collectDeps(ast);
    expect(result).toEqual(["z", "a", "m"]);
    expect(collectDeps(ast)).toEqual(result);
  });

  it("includes refs from if/then/else", () => {
    const ast: Expr = {
      op: "if",
      left: { op: "ref", path: "cond" },
      then: { op: "ref", path: "thenVal" },
      else: { op: "ref", path: "elseVal" },
    };
    expect(collectDeps(ast)).toEqual(["cond", "thenVal", "elseVal"]);
  });

  it("includes refs from coalesce args", () => {
    const ast: Expr = {
      op: "coalesce",
      args: [
        { op: "ref", path: "a" },
        { op: "ref", path: "b" },
        { op: "lit", value: 0 },
      ],
    };
    expect(collectDeps(ast)).toEqual(["a", "b"]);
  });

  it("returns empty for lit-only AST", () => {
    const ast: Expr = { op: "lit", value: 42 };
    expect(collectDeps(ast)).toEqual([]);
  });
});
