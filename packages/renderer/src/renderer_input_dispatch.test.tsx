import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "./PageRenderer.js";
import type { WidgetRegistry, WidgetProps } from "./types.js";

const minimalDoc = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["nameField"],
    },
    nameField: {
      id: "nameField",
      type: "core.TextInput",
      bindings: { value: "form.values.name" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: {
    submitOperation: { operationId: "test" },
    mapping: [],
  },
} as Parameters<typeof createFormEngine>[0];

const testRegistry: WidgetRegistry = {
  FormGrid: ((p: WidgetProps) => <div data-testid="grid">{p.children}</div>) as React.ComponentType<WidgetProps>,
  "layout.FormGrid": ((p: WidgetProps) => <div data-testid="grid">{p.children}</div>) as React.ComponentType<WidgetProps>,
  "core.TextInput": ((p: WidgetProps) => (
    <input
      data-testid="input-name"
      value={String(p.value ?? "")}
      onChange={(e) => p.onChange?.(e.target.value)}
    />
  )) as React.ComponentType<WidgetProps>,
};

describe("renderer_input_dispatch", () => {
  it("typing in TextInput updates store and displayed value", () => {
    const engine = createFormEngine(minimalDoc);

    render(
      <PageRenderer doc={minimalDoc} engine={engine} registry={testRegistry} />
    );

    const input = screen.getByTestId("input-name");
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Alice" } });

    expect(input).toHaveValue("Alice");
    expect(engine.store.getState().engine.values).toMatchObject({
      form: { values: { name: "Alice" } },
    });
  });
});
