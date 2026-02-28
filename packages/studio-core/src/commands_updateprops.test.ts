import { describe, it, expect } from "vitest";
import { applyCommand } from "./commands.js";

const minimalDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["section1"],
    },
    section1: {
      id: "section1",
      type: "Section",
      children: [],
      props: { title: "Old Title" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
} as Parameters<typeof applyCommand>[0];

describe("commands UpdateProps", () => {
  it("merges partialProps into node.props", () => {
    const result = applyCommand(minimalDoc, {
      type: "UpdateProps",
      nodeId: "section1",
      partialProps: { title: "New Title" },
    });
    expect(result.doc.nodes.section1?.props).toEqual({ title: "New Title" });
    expect(result.diagnostics).toHaveLength(0);
  });

  it("preserves other props when merging", () => {
    const result = applyCommand(minimalDoc, {
      type: "UpdateProps",
      nodeId: "section1",
      partialProps: { subtitle: "Sub" },
    });
    expect(result.doc.nodes.section1?.props).toEqual({
      title: "Old Title",
      subtitle: "Sub",
    });
  });

  it("returns unchanged doc when nodeId not found", () => {
    const result = applyCommand(minimalDoc, {
      type: "UpdateProps",
      nodeId: "nonexistent",
      partialProps: { x: 1 },
    });
    expect(result.doc).toBe(minimalDoc);
  });

  it("does not mutate input doc", () => {
    const copy = JSON.parse(JSON.stringify(minimalDoc));
    applyCommand(minimalDoc, {
      type: "UpdateProps",
      nodeId: "section1",
      partialProps: { title: "Changed" },
    });
    expect(minimalDoc.nodes.section1?.props?.title).toBe("Old Title");
  });
});
