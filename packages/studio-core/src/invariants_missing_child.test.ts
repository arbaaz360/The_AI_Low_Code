import { describe, it, expect } from "vitest";
import { validateInvariants } from "./invariants.js";

describe("invariants missing child", () => {
  it("reports when parent references non-existent child", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: {
        root: {
          id: "root",
          type: "FormGrid",
          children: ["ghost"], // ghost does not exist
        },
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "test" }, mapping: [] },
    } as Parameters<typeof validateInvariants>[0];

    const diag = validateInvariants(doc);
    expect(diag.some((d) => d.code === "INVARIANT_MISSING_CHILD")).toBe(true);
    expect(diag.find((d) => d.code === "INVARIANT_MISSING_CHILD")?.message).toContain("ghost");
  });

  it("reports when rootNodeId does not exist", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "missing",
      nodes: {
        other: { id: "other", type: "Section", children: [] },
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "test" }, mapping: [] },
    } as Parameters<typeof validateInvariants>[0];

    const diag = validateInvariants(doc);
    expect(diag.some((d) => d.code === "INVARIANT_ROOT_MISSING")).toBe(true);
  });

  it("reports orphan nodes", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: {
        root: { id: "root", type: "FormGrid", children: [] },
        orphan: { id: "orphan", type: "Section", children: [] }, // not a child of anyone
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "test" }, mapping: [] },
    } as Parameters<typeof validateInvariants>[0];

    const diag = validateInvariants(doc);
    expect(diag.some((d) => d.code === "INVARIANT_ORPHAN")).toBe(true);
  });

  it("reports key/id mismatch", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: {
        root: { id: "root", type: "FormGrid", children: [] },
        badKey: { id: "differentId", type: "Section", children: [] },
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "test" }, mapping: [] },
    } as Parameters<typeof validateInvariants>[0];

    const diag = validateInvariants(doc);
    expect(diag.some((d) => d.code === "INVARIANT_KEY_MISMATCH")).toBe(true);
  });
});
