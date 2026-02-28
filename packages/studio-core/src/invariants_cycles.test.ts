import { describe, it, expect } from "vitest";
import { validateInvariants } from "./invariants.js";

describe("invariants cycles", () => {
  it("reports cycle when child references ancestor", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: {
        root: {
          id: "root",
          type: "FormGrid",
          children: ["a"],
        },
        a: {
          id: "a",
          type: "Section",
          children: ["b"],
        },
        b: {
          id: "b",
          type: "Section",
          children: ["a"], // cycle: a -> b -> a
        },
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "test" }, mapping: [] },
    } as Parameters<typeof validateInvariants>[0];

    const diag = validateInvariants(doc);
    expect(diag.some((d) => d.code === "INVARIANT_CYCLE")).toBe(true);
    expect(diag.find((d) => d.code === "INVARIANT_CYCLE")?.message).toContain("a");
  });

  it("reports self-cycle", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: {
        root: {
          id: "root",
          type: "FormGrid",
          children: ["root"], // self cycle
        },
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "test" }, mapping: [] },
    } as Parameters<typeof validateInvariants>[0];

    const diag = validateInvariants(doc);
    expect(diag.some((d) => d.code === "INVARIANT_CYCLE")).toBe(true);
  });
});
