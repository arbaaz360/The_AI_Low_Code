import { describe, it, expect } from "vitest";
import { findParentMap, resolveDrop, parseCanvasInsideOverId } from "./dropResolution.js";

const doc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      children: ["a", "b"],
    },
    a: { id: "a", type: "core.Section", children: ["a1", "a2"] },
    a1: { id: "a1", type: "core.TextInput" },
    a2: { id: "a2", type: "core.TextInput" },
    b: { id: "b", type: "core.Section", children: [] },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof findParentMap>[0];

describe("findParentMap", () => {
  it("maps each non-root node to parentId and index", () => {
    const map = findParentMap(doc);
    expect(map.get("a")).toEqual({ parentId: "root", index: 0 });
    expect(map.get("b")).toEqual({ parentId: "root", index: 1 });
    expect(map.get("a1")).toEqual({ parentId: "a", index: 0 });
    expect(map.get("a2")).toEqual({ parentId: "a", index: 1 });
    expect(map.has("root")).toBe(false);
  });
});

describe("resolveDrop", () => {
  it("returns null when activeId is root", () => {
    expect(resolveDrop(doc, "root", "before-a", "before")).toBeNull();
  });

  it("inside container: insert as last child", () => {
    const r = resolveDrop(doc, "a1", "inside-b", "inside");
    expect(r).toEqual({ toParentId: "b", toIndex: 0 });
  });

  it("inside root: insert as last child", () => {
    const r = resolveDrop(doc, "a1", "inside-root", "inside");
    expect(r).toEqual({ toParentId: "root", toIndex: 2 });
  });

  it("before node: insert at sibling index", () => {
    const r = resolveDrop(doc, "a2", "before-a1", "before");
    expect(r).toEqual({ toParentId: "a", toIndex: 0 });
  });

  it("after node: insert at sibling index + 1", () => {
    const r = resolveDrop(doc, "a1", "after-a2", "after");
    expect(r).toEqual({ toParentId: "a", toIndex: 2 });
  });

  it("returns null for inside leaf", () => {
    expect(resolveDrop(doc, "a", "inside-a1", "inside")).toBeNull();
  });
});

describe("parseCanvasInsideOverId", () => {
  it('parses canvas-inside-abc to "abc"', () => {
    expect(parseCanvasInsideOverId("canvas-inside-abc")).toBe("abc");
  });

  it("returns null for invalid input", () => {
    expect(parseCanvasInsideOverId("inside-abc")).toBeNull();
    expect(parseCanvasInsideOverId("canvas-inside-")).toBe("");
    expect(parseCanvasInsideOverId("")).toBeNull();
    expect(parseCanvasInsideOverId("other-prefix")).toBeNull();
  });
});
