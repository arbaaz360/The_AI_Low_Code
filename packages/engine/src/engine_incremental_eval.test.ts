import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createFormEngine } from "./createFormEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = resolve(__dirname, "../../../samples");

function loadFormRules(): unknown {
  return JSON.parse(readFileSync(resolve(SAMPLES_DIR, "form_rules.json"), "utf-8"));
}

describe("engine_incremental_eval", () => {
  it("change accountType impacts visibility exprs; change companyName does not", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const evalCounts: Record<string, number> = {};

    const engine = createFormEngine(formDoc, {
      onEvalCount: (exprId) => {
        evalCounts[exprId] = (evalCounts[exprId] ?? 0) + 1;
      },
    });

    const baseline = { ...evalCounts };

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.accountType", value: "company" })
    );

    const afterAccountType = { ...evalCounts };
    const accountTypeDeltas: Record<string, number> = {};
    for (const id of Object.keys(afterAccountType)) {
      accountTypeDeltas[id] = (afterAccountType[id] ?? 0) - (baseline[id] ?? 0);
    }

    const visibilityExprIds = Object.keys(accountTypeDeltas).filter((k) => k.startsWith("visibility:"));
    expect(visibilityExprIds.length).toBeGreaterThan(0);
    for (const id of visibilityExprIds) {
      expect(accountTypeDeltas[id]).toBeGreaterThan(0);
    }

    engine.store.dispatch(
      engine.actions.setValue({ path: "form.values.companyName", value: "Acme" })
    );

    const afterCompanyName = { ...evalCounts };
    const companyNameDeltas: Record<string, number> = {};
    for (const id of Object.keys(afterCompanyName)) {
      companyNameDeltas[id] = (afterCompanyName[id] ?? 0) - (afterAccountType[id] ?? 0);
    }

    for (const id of visibilityExprIds) {
      expect(companyNameDeltas[id] ?? 0).toBe(0);
    }
  });
});
