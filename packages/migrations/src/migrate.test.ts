import { describe, it, expect } from "vitest";
import { migrateFormDoc, CURRENT_SCHEMA_VERSION } from "./migrate.js";

describe("migrateFormDoc", () => {
  it("migrates legacy widget types from 1.0 to 1.1", () => {
    const doc = {
      schemaVersion: "1.0",
      pageFamily: "Form",
      rootNodeId: "root",
      nodes: {
        root: { id: "root", type: "FormGrid", children: ["sec"] },
        sec: { id: "sec", type: "Section", children: ["stk"] },
        stk: { id: "stk", type: "Stack", children: [] },
      },
      dataContext: { entity: "Test", mode: "create" },
      submission: { submitOperation: { operationId: "op1" }, mapping: [] },
    };

    const result = migrateFormDoc(doc);
    expect(result.migrated).toBe(true);
    expect(result.from).toBe("1.0");
    expect(result.to).toBe("1.1");
    const nodes = result.doc.nodes as Record<string, { type: string }>;
    expect(nodes.root.type).toBe("layout.FormGrid");
    expect(nodes.sec.type).toBe("layout.Section");
    expect(nodes.stk.type).toBe("layout.Stack");
    expect(result.warnings).toHaveLength(3);
  });

  it("does not mutate the original doc", () => {
    const doc = {
      schemaVersion: "1.0",
      nodes: {
        root: { id: "root", type: "FormGrid", children: [] },
      },
    };
    migrateFormDoc(doc);
    expect((doc.nodes.root as { type: string }).type).toBe("FormGrid");
  });

  it("leaves canonical types untouched", () => {
    const doc = {
      schemaVersion: "1.0",
      nodes: {
        root: { id: "root", type: "layout.Section", children: [] },
      },
    };
    const result = migrateFormDoc(doc);
    const nodes = result.doc.nodes as Record<string, { type: string }>;
    expect(nodes.root.type).toBe("layout.Section");
    expect(result.warnings).toHaveLength(0);
  });

  it("returns migrated: false for already current version", () => {
    const doc = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      nodes: { root: { id: "root", type: "core.TextInput" } },
    };
    const result = migrateFormDoc(doc);
    expect(result.migrated).toBe(false);
    expect(result.from).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.to).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("handles missing schemaVersion as 1.0", () => {
    const doc = {
      nodes: { root: { id: "root", type: "FormGrid", children: [] } },
    };
    const result = migrateFormDoc(doc);
    expect(result.from).toBe("1.0");
    expect(result.migrated).toBe(true);
  });
});
