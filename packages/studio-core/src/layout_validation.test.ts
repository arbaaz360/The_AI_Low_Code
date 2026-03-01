import { describe, it, expect } from "vitest";
import { clampSpan, validateLayoutSpan } from "./layoutValidation.js";

describe("clampSpan", () => {
  it("clamps values to 1..12", () => {
    expect(clampSpan(0)).toBe(1);
    expect(clampSpan(1)).toBe(1);
    expect(clampSpan(6)).toBe(6);
    expect(clampSpan(12)).toBe(12);
    expect(clampSpan(13)).toBe(12);
    expect(clampSpan(-5)).toBe(1);
  });

  it("rounds non-integers", () => {
    expect(clampSpan(5.4)).toBe(5);
    expect(clampSpan(5.6)).toBe(6);
  });
});

describe("validateLayoutSpan", () => {
  it("returns empty for missing or empty layout", () => {
    expect(validateLayoutSpan("n1", undefined)).toEqual([]);
    expect(validateLayoutSpan("n1", {})).toEqual([]);
  });

  it("returns empty for valid span", () => {
    expect(validateLayoutSpan("n1", { span: { xs: 12, md: 6 } })).toEqual([]);
    expect(validateLayoutSpan("n1", { span: { xs: 1 } })).toEqual([]);
  });

  it("returns diagnostic for invalid xs", () => {
    const d = validateLayoutSpan("n1", { span: { xs: 0 } });
    expect(d).toHaveLength(1);
    expect(d[0]!.code).toBe("LAYOUT_SPAN_INVALID");
    expect(d[0]!.severity).toBe("warn");
    expect(d[0]!.nodeId).toBe("n1");
  });

  it("returns diagnostic for out-of-range md", () => {
    const d = validateLayoutSpan("n1", { span: { xs: 12, md: 99 } });
    expect(d).toHaveLength(1);
    expect(d[0]!.message).toContain("1-12");
  });
});
