import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "./PageRenderer.js";
import type { WidgetRegistry, WidgetProps } from "./types.js";

const docWithNoLabel = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["unnamedField"],
    },
    unnamedField: {
      id: "unnamedField",
      type: "core.TextInput",
      bindings: { value: "form.values.x" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: {
    submitOperation: { operationId: "test" },
    mapping: [],
  },
} as Parameters<typeof createFormEngine>[0];

function TestTextInput(p: WidgetProps) {
  return (
    <div data-testid="widget" data-label={p.label ?? "__undefined__"}>
      <input value={String(p.value ?? "")} onChange={(e) => p.onChange?.(e.target.value)} />
    </div>
  );
}

const testRegistry: WidgetRegistry = {
  FormGrid: ((p: WidgetProps) => <div>{p.children}</div>) as React.ComponentType<WidgetProps>,
  "layout.FormGrid": ((p: WidgetProps) => <div>{p.children}</div>) as React.ComponentType<WidgetProps>,
  "core.TextInput": TestTextInput,
};

describe("renderer_label_no_invention", () => {
  it("runtime mode does not display humanized label when node has no label", () => {
    const engine = createFormEngine(docWithNoLabel);

    const { container } = render(
      <PageRenderer doc={docWithNoLabel} engine={engine} registry={testRegistry} mode="runtime" />
    );

    const widget = container.querySelector("[data-label='__undefined__']");
    expect(widget).toBeTruthy();
  });

  it("design mode shows humanized fallback when node has no label", () => {
    const engine = createFormEngine(docWithNoLabel);

    const { container } = render(
      <PageRenderer doc={docWithNoLabel} engine={engine} registry={testRegistry} mode="design" />
    );

    const widget = container.querySelector("[data-label='Unnamed Field']");
    expect(widget).toBeTruthy();
  });
});
