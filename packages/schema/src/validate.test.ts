import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { validateFormDoc } from "./validate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = resolve(__dirname, "../../../samples");

function loadSample(name: string): unknown {
  const path = resolve(SAMPLES_DIR, name);
  const raw = readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

describe("validateFormDoc", () => {
  it("form_basic.json validates successfully", () => {
    const doc = loadSample("form_basic.json");
    const result = validateFormDoc(doc);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("form_rules.json validates successfully", () => {
    const doc = loadSample("form_rules.json");
    const result = validateFormDoc(doc);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("form_big.json validates successfully", () => {
    const doc = loadSample("form_big.json");
    const result = validateFormDoc(doc);

    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns readable errors when document is invalid", () => {
    const invalidDoc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: { root: { id: "root", type: "FormGrid" } },
      dataContext: { entity: "X" },
      submission: {}
    };

    const result = validateFormDoc(invalidDoc);

    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    result.errors.forEach((err) => {
      expect(err).toHaveProperty("path");
      expect(err).toHaveProperty("message");
      expect(typeof err.path).toBe("string");
      expect(typeof err.message).toBe("string");
    });
  });

  it("returns stable error format (path + message)", () => {
    const invalidDoc = { schemaVersion: 123, pageFamily: "Form" };

    const result1 = validateFormDoc(invalidDoc);
    const result2 = validateFormDoc(invalidDoc);

    expect(result1.ok).toBe(false);
    expect(result2.ok).toBe(false);
    expect(result1.errors).toEqual(result2.errors);
    expect(result1.errors.every((e) => "path" in e && "message" in e)).toBe(true);
  });
});
