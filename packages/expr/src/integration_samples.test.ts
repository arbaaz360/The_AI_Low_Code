import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { collectDeps, isExpr } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = resolve(__dirname, "../../../samples");

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

/** Recursively collect all Expr ASTs from a FormDoc (or any nested structure). */
function findAllExprs(obj: unknown): unknown[] {
  const out: unknown[] = [];
  function walk(val: unknown): void {
    if (val == null || typeof val !== "object") return;
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    const o = val as Record<string, unknown>;
    if (isExpr(val)) {
      out.push(val);
      return;
    }
    for (const v of Object.values(o)) {
      walk(v);
    }
  }
  walk(obj);
  return out;
}

describe("integration_samples", () => {
  it("loads samples/form_rules.json, walks document, finds all expression ASTs, collectDeps returns expected non-empty sets", () => {
    const doc = loadJson(resolve(SAMPLES_DIR, "form_rules.json"));
    const exprs = findAllExprs(doc);

    expect(exprs.length).toBeGreaterThan(0);

    const allDeps = new Set<string>();
    for (const ex of exprs) {
      const deps = collectDeps(ex as Parameters<typeof collectDeps>[0]);
      expect(Array.isArray(deps)).toBe(true);
      for (const d of deps) {
        allDeps.add(d);
      }
    }

    expect(allDeps.size).toBeGreaterThan(0);
    expect(allDeps.has("form.values.accountType")).toBe(true);
  });
});
