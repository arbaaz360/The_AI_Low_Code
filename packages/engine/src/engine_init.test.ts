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

describe("engine_init", () => {
  it("creates engine from samples/form_rules.json, computes initial visibility/disabled", () => {
    const formDoc = loadFormRules() as Parameters<typeof createFormEngine>[0];
    const engine = createFormEngine(formDoc);

    const state = engine.store.getState();

    expect(state.engine.formDoc).toBeTruthy();
    expect(state.engine.values).toBeTruthy();

    const selectVisible = engine.selectors.makeSelectNodeVisible("companyFields");
    const selectDisabled = engine.selectors.makeSelectNodeDisabled("companyFields");

    expect(selectVisible(state)).toBe(false);
    expect(selectDisabled(state)).toBe(false);

    const selectIndividualVisible = engine.selectors.makeSelectNodeVisible("individualFields");
    expect(selectIndividualVisible(state)).toBe(false);

    engine.store.dispatch(engine.actions.setValue({ path: "form.values.accountType", value: "company" }));

    const stateAfter = engine.store.getState();
    expect(selectVisible(stateAfter)).toBe(true);
    expect(selectIndividualVisible(stateAfter)).toBe(false);

    engine.store.dispatch(engine.actions.setValue({ path: "form.values.accountType", value: "individual" }));

    const stateIndividual = engine.store.getState();
    expect(selectVisible(stateIndividual)).toBe(false);
    expect(selectIndividualVisible(stateIndividual)).toBe(true);
  });
});
