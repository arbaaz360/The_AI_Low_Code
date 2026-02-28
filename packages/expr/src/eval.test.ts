import { describe, it, expect } from "vitest";
import { evalAst } from "./eval.js";
import type { Expr } from "./ast.js";

function ctx(data: Record<string, unknown>) {
  return {
    get: (path: string) => {
      const parts = path.split(".");
      let v: unknown = data;
      for (const p of parts) {
        v = (v as Record<string, unknown>)?.[p];
      }
      return v;
    },
  };
}

describe("evalAst", () => {
  it("lit returns value", () => {
    expect(evalAst({ op: "lit", value: 42 }, ctx({}))).toBe(42);
    expect(evalAst({ op: "lit", value: "hi" }, ctx({}))).toBe("hi");
    expect(evalAst({ op: "lit", value: true }, ctx({}))).toBe(true);
  });

  it("ref returns ctx.get(path); missing yields undefined", () => {
    const c = ctx({ form: { values: { x: 10 } } });
    expect(evalAst({ op: "ref", path: "form.values.x" }, c)).toBe(10);
    expect(evalAst({ op: "ref", path: "form.values.missing" }, c)).toBeUndefined();
    expect(evalAst({ op: "ref", path: "nonexistent" }, c)).toBeUndefined();
  });

  it("eq/neq", () => {
    const c = ctx({ a: 1, b: 1, c: 2 });
    expect(evalAst({ op: "eq", left: { op: "ref", path: "a" }, right: { op: "ref", path: "b" } }, c)).toBe(true);
    expect(evalAst({ op: "eq", left: { op: "ref", path: "a" }, right: { op: "ref", path: "c" } }, c)).toBe(false);
    expect(evalAst({ op: "neq", left: { op: "ref", path: "a" }, right: { op: "ref", path: "c" } }, c)).toBe(true);
  });

  it("eq with null/undefined well-defined", () => {
    const c = ctx({});
    expect(evalAst({ op: "eq", left: { op: "lit", value: null }, right: { op: "lit", value: null } }, c)).toBe(true);
    expect(evalAst({ op: "eq", left: { op: "ref", path: "x" }, right: { op: "ref", path: "y" } }, c)).toBe(true);
    expect(evalAst({ op: "neq", left: { op: "lit", value: null }, right: { op: "lit", value: 1 } }, c)).toBe(true);
  });

  it("gt/gte/lt/lte", () => {
    const c = ctx({});
    expect(evalAst({ op: "gt", left: { op: "lit", value: 5 }, right: { op: "lit", value: 3 } }, c)).toBe(true);
    expect(evalAst({ op: "gte", left: { op: "lit", value: 5 }, right: { op: "lit", value: 5 } }, c)).toBe(true);
    expect(evalAst({ op: "lt", left: { op: "lit", value: 2 }, right: { op: "lit", value: 5 } }, c)).toBe(true);
    expect(evalAst({ op: "lte", left: { op: "lit", value: 2 }, right: { op: "lit", value: 2 } }, c)).toBe(true);
  });

  it("and short-circuits", () => {
    const c = ctx({ x: false });
    const ast: Expr = {
      op: "and",
      left: { op: "ref", path: "x" },
      right: { op: "ref", path: "neverDefined" },
    };
    expect(evalAst(ast, c)).toBe(false);
  });

  it("or short-circuits", () => {
    const c = ctx({ x: true });
    const ast: Expr = {
      op: "or",
      left: { op: "ref", path: "x" },
      right: { op: "ref", path: "neverDefined" },
    };
    expect(evalAst(ast, c)).toBe(true);
  });

  it("not", () => {
    const c = ctx({});
    expect(evalAst({ op: "not", left: { op: "lit", value: true } }, c)).toBe(false);
    expect(evalAst({ op: "not", args: [{ op: "lit", value: false }] }, c)).toBe(true);
  });

  it("if", () => {
    const c = ctx({});
    expect(
      evalAst(
        {
          op: "if",
          left: { op: "lit", value: true },
          then: { op: "lit", value: "yes" },
          else: { op: "lit", value: "no" },
        },
        c
      )
    ).toBe("yes");
    expect(
      evalAst(
        {
          op: "if",
          left: { op: "lit", value: false },
          then: { op: "lit", value: "yes" },
          else: { op: "lit", value: "no" },
        },
        c
      )
    ).toBe("no");
  });

  it("coalesce returns first non-null/undefined", () => {
    const c = ctx({ a: null, b: "ok" });
    expect(
      evalAst(
        {
          op: "coalesce",
          args: [{ op: "ref", path: "a" }, { op: "ref", path: "b" }],
        },
        c
      )
    ).toBe("ok");
    expect(
      evalAst(
        {
          op: "coalesce",
          args: [{ op: "ref", path: "missing" }, { op: "lit", value: "default" }],
        },
        c
      )
    ).toBe("default");
  });
});
