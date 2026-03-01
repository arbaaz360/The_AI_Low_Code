import { describe, it, expect } from "vitest";
import {
  parseCanvasBeforeOverId,
  parseCanvasAfterOverId,
  resolveCanvasBeforeAfter,
  findParentMap,
  isDescendant,
} from "./dropResolution.js";
import { applyCommand } from "./commands.js";

const doc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: { id: "root", type: "FormGrid", layout: { columns: 12 }, children: ["a", "b"] },
    a: { id: "a", type: "core.Section", children: ["a1", "a2", "a3"] },
    a1: { id: "a1", type: "core.TextInput" },
    a2: { id: "a2", type: "core.TextInput" },
    a3: { id: "a3", type: "core.TextInput" },
    b: { id: "b", type: "core.Section", children: [] },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof resolveCanvasBeforeAfter>[0];

describe("parseCanvasBeforeOverId", () => {
  it('parses canvas-before-abc to "abc"', () => {
    expect(parseCanvasBeforeOverId("canvas-before-abc")).toBe("abc");
  });
  it("returns null for invalid input", () => {
    expect(parseCanvasBeforeOverId("canvas-after-abc")).toBeNull();
    expect(parseCanvasBeforeOverId("canvas-before-")).toBe("");
  });
});

describe("parseCanvasAfterOverId", () => {
  it('parses canvas-after-abc to "abc"', () => {
    expect(parseCanvasAfterOverId("canvas-after-abc")).toBe("abc");
  });
  it("returns null for invalid input", () => {
    expect(parseCanvasAfterOverId("canvas-before-abc")).toBeNull();
  });
});

describe("resolveCanvasBeforeAfter", () => {
  it("resolves canvas-before-a1 to parent a, index 0", () => {
    const r = resolveCanvasBeforeAfter(doc, "canvas-before-a1");
    expect(r).toEqual({ toParentId: "a", toIndex: 0 });
  });

  it("resolves canvas-after-a1 to parent a, index 1", () => {
    const r = resolveCanvasBeforeAfter(doc, "canvas-after-a1");
    expect(r).toEqual({ toParentId: "a", toIndex: 1 });
  });

  it("resolves canvas-before-a2 to parent a, index 1", () => {
    const r = resolveCanvasBeforeAfter(doc, "canvas-before-a2");
    expect(r).toEqual({ toParentId: "a", toIndex: 1 });
  });

  it("resolves canvas-after-a3 to parent a, index 3", () => {
    const r = resolveCanvasBeforeAfter(doc, "canvas-after-a3");
    expect(r).toEqual({ toParentId: "a", toIndex: 3 });
  });
});

describe("same-parent index correction", () => {
  it("when moving a1 (index 0) after a2 (index 1), toIndex becomes 1 not 2", () => {
    const r = resolveCanvasBeforeAfter(doc, "canvas-after-a2");
    expect(r).toEqual({ toParentId: "a", toIndex: 2 });
    const parentMap = findParentMap(doc);
    const activeParent = parentMap.get("a1");
    expect(activeParent).toEqual({ parentId: "a", index: 0 });
    let toIndex = r!.toIndex;
    if (activeParent && activeParent.parentId === r!.toParentId && activeParent.index < toIndex) {
      toIndex -= 1;
    }
    expect(toIndex).toBe(1);
  });
});

describe("isDescendant", () => {
  it("returns true when candidate equals ancestor", () => {
    expect(isDescendant(doc, "a", "a")).toBe(true);
  });

  it("returns true when candidate is child of ancestor", () => {
    expect(isDescendant(doc, "a", "a1")).toBe(true);
    expect(isDescendant(doc, "a", "a2")).toBe(true);
  });

  it("returns true when candidate is grandchild of ancestor", () => {
    const docDeep = {
      ...doc,
      nodes: {
        ...doc.nodes,
        a: { id: "a", type: "core.Section", children: ["a1"] },
        a1: { id: "a1", type: "core.Section", children: ["a1a"] },
        a1a: { id: "a1a", type: "core.TextInput" },
      },
    } as typeof doc;
    expect(isDescendant(docDeep, "a", "a1a")).toBe(true);
  });

  it("returns false when candidate is not in ancestor subtree", () => {
    expect(isDescendant(doc, "a", "b")).toBe(false);
    expect(isDescendant(doc, "a1", "a2")).toBe(false);
  });
});

describe("subtree prevention", () => {
  it("applyCommand refuses MoveNode into own subtree with MOVE_INTO_SUBTREE", () => {
    const docWithNesting = {
      ...doc,
      nodes: {
        ...doc.nodes,
        a: { id: "a", type: "core.Section", children: ["a1"] },
        a1: { id: "a1", type: "core.Section", children: [] },
      },
    } as typeof doc;

    // Move a (Section) into a1 (its child Section) - would create cycle
    const { doc: outDoc, diagnostics } = applyCommand(docWithNesting, {
      type: "MoveNode",
      nodeId: "a",
      parentId: "a1",
      index: 0,
    });

    expect(outDoc).toBe(docWithNesting);
    expect(diagnostics.some((d) => d.code === "MOVE_INTO_SUBTREE")).toBe(true);
  });
});
