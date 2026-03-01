import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";
import { createFormEngine } from "@ai-low-code/engine";
import { PageRenderer } from "./PageRenderer.jsx";
import { createActionRunner, type ActionRunner } from "@ai-low-code/actions";
import { evalAst } from "@ai-low-code/expr";
import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { WidgetProps, WidgetRegistry } from "./types.js";

const theme = createTheme();

function TextInput({ nodeId, nodeType, value, onChange, label, mode }: WidgetProps) {
  return (
    <input
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-testid={`widget-${nodeId}`}
      value={String(value ?? "")}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={label ?? nodeId}
    />
  );
}

function ButtonWidget({ nodeId, nodeType, onClick, label, mode }: WidgetProps) {
  return (
    <button
      data-nodeid={mode === "design" ? nodeId : undefined}
      data-testid={`widget-${nodeId}`}
      onClick={() => onClick?.()}
    >
      {label ?? "Click"}
    </button>
  );
}

function ContainerWidget({ nodeId, children, mode }: WidgetProps) {
  return <div data-nodeid={mode === "design" ? nodeId : undefined}>{children}</div>;
}

const registry: WidgetRegistry = {
  "layout.FormGrid": ContainerWidget,
  FormGrid: ContainerWidget,
  "core.TextInput": TextInput,
  "core.Button": ButtonWidget,
};

function makeDoc(nodes: Record<string, FormNode>, rootNodeId = "root"): FormDoc {
  return {
    schemaVersion: "1.0",
    pageFamily: "Form",
    rootNodeId,
    nodes,
    dataContext: { entity: "Test", mode: "create" },
    submission: { submitOperation: { operationId: "test.create" }, mapping: [] },
  };
}

import {
  dataRequestStarted,
  dataRequestSucceeded,
  dataRequestFailed,
  dataSetByKey,
} from "@ai-low-code/engine";

function makeRunner(
  engine: ReturnType<typeof createFormEngine>,
  overrides?: {
    toast?: ReturnType<typeof vi.fn>;
    navigate?: ReturnType<typeof vi.fn>;
    dataSourceClient?: { execute: ReturnType<typeof vi.fn> };
  }
): ActionRunner {
  return createActionRunner({
    dispatch: (a) => engine.store.dispatch(a),
    getState: () => engine.store.getState() as { engine: { values: Record<string, unknown>; data: { byKey: Record<string, unknown> } } },
    setValueActionCreator: (p) => engine.actions.setValue(p),
    dataRequestStartedCreator: (p) => dataRequestStarted(p),
    dataRequestSucceededCreator: (p) => dataRequestSucceeded(p),
    dataRequestFailedCreator: (p) => dataRequestFailed(p),
    dataSetByKeyCreator: (p) => dataSetByKey(p),
    dataSourceClient: overrides?.dataSourceClient,
    evalExpr: (ast, ctx) => evalAst(ast, ctx),
    toast: overrides?.toast ?? vi.fn(),
    navigate: overrides?.navigate ?? vi.fn(),
  });
}

describe("renderer action integration", () => {
  afterEach(() => cleanup());
  it("backward compat: onChange with bindings.value dispatches setValue without actionRunner", () => {
    const doc = makeDoc({
      root: { id: "root", type: "FormGrid", children: ["t1"], layout: { columns: 12 } },
      t1: { id: "t1", type: "core.TextInput", bindings: { value: "form.values.name" } },
    });
    const engine = createFormEngine(doc, { initialValues: { form: { values: { name: "" } } } });

    render(
      <ThemeProvider theme={theme}><CssBaseline />
        <PageRenderer doc={doc} engine={engine} registry={registry} mode="runtime" />
      </ThemeProvider>
    );

    fireEvent.change(screen.getByTestId("widget-t1"), { target: { value: "Alice" } });
    const state = engine.store.getState() as { engine: { values: Record<string, unknown> } };
    const vals = state.engine.values as { form: { values: { name: unknown } } };
    expect(vals.form.values.name).toBe("Alice");
  });

  it("explicit onClick runs Toast + Navigate via actionRunner", async () => {
    const toastFn = vi.fn();
    const navigateFn = vi.fn();

    const doc = makeDoc({
      root: { id: "root", type: "FormGrid", children: ["btn"], layout: { columns: 12 } },
      btn: {
        id: "btn",
        type: "core.Button",
        props: { label: "Save" },
        events: {
          onClick: [
            { type: "Toast", message: "Saved!", severity: "success" },
            { type: "Navigate", to: "/done" },
          ],
        },
      },
    });
    const engine = createFormEngine(doc, {});
    const runner = makeRunner(engine, { toast: toastFn, navigate: navigateFn });

    render(
      <ThemeProvider theme={theme}><CssBaseline />
        <PageRenderer doc={doc} engine={engine} registry={registry} mode="runtime" actionRunner={runner} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId("widget-btn"));
    await vi.waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith({ message: "Saved!", severity: "success" });
      expect(navigateFn).toHaveBeenCalledWith("/done");
    });
  });

  it("design mode suppresses Toast/Navigate but still does SetValue", async () => {
    const toastFn = vi.fn();
    const navigateFn = vi.fn();

    const doc = makeDoc({
      root: { id: "root", type: "FormGrid", children: ["t1"], layout: { columns: 12 } },
      t1: {
        id: "t1",
        type: "core.TextInput",
        bindings: { value: "form.values.name" },
        events: {
          onChange: [
            { type: "SetValue", path: "form.values.name", value: { $event: "value" } },
            { type: "Toast", message: "Changed" },
          ],
        },
      },
    });
    const engine = createFormEngine(doc, { initialValues: { form: { values: { name: "" } } } });
    const runner = makeRunner(engine, { toast: toastFn, navigate: navigateFn });

    render(
      <ThemeProvider theme={theme}><CssBaseline />
        <PageRenderer doc={doc} engine={engine} registry={registry} mode="design" actionRunner={runner} />
      </ThemeProvider>
    );

    fireEvent.change(screen.getByTestId("widget-t1"), { target: { value: "Bob" } });
    await vi.waitFor(() => {
      const state = engine.store.getState() as { engine: { values: Record<string, unknown> } };
      const vals = state.engine.values as { form: { values: { name: unknown } } };
      expect(vals.form.values.name).toBe("Bob");
    });
    expect(toastFn).not.toHaveBeenCalled();
  });

  it("pageEvents.onLoad triggers CallDataSource and select renders from data", async () => {
    const mockOptions = [
      { value: "US", label: "United States" },
      { value: "CA", label: "Canada" },
    ];
    const mockClient = { execute: vi.fn().mockResolvedValue(mockOptions) };

    function SelectWidget({ nodeId, value, onChange, options, mode }: WidgetProps) {
      const opts = Array.isArray(options) ? options : [];
      return (
        <select
          data-testid={`widget-${nodeId}`}
          value={String(value ?? "")}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <option value="">-- select --</option>
          {opts.map((o: unknown, i: number) => {
            const item = o as { value: string; label: string };
            return <option key={i} value={item.value}>{item.label}</option>;
          })}
        </select>
      );
    }

    const testRegistry: WidgetRegistry = {
      ...registry,
      "core.Select": SelectWidget,
    };

    const doc = makeDoc({
      root: { id: "root", type: "FormGrid", children: ["sel1"], layout: { columns: 12 } },
      sel1: {
        id: "sel1",
        type: "core.Select",
        bindings: { value: "form.values.country", options: "data.byKey.countries" },
      },
    });
    (doc as unknown as Record<string, unknown>).pageEvents = {
      onLoad: [
        { type: "CallDataSource", dataSourceId: "ds_countries", resultKey: "countries", requestKey: "req_countries" },
      ],
    };

    const engine = createFormEngine(doc, { initialValues: { form: { values: { country: "" } } } });
    const runner = makeRunner(engine, { dataSourceClient: mockClient });

    render(
      <ThemeProvider theme={theme}><CssBaseline />
        <PageRenderer doc={doc} engine={engine} registry={testRegistry} mode="runtime" actionRunner={runner} />
      </ThemeProvider>
    );

    await vi.waitFor(() => {
      expect(mockClient.execute).toHaveBeenCalledWith(expect.objectContaining({ dataSourceId: "ds_countries" }));
    });

    await vi.waitFor(() => {
      const sel = screen.getByTestId("widget-sel1") as HTMLSelectElement;
      expect(sel.querySelectorAll("option").length).toBeGreaterThanOrEqual(3);
    });
  });

  it("design mode does NOT run pageEvents.onLoad", async () => {
    const mockClient = { execute: vi.fn().mockResolvedValue([]) };

    const doc = makeDoc({
      root: { id: "root", type: "FormGrid", children: [], layout: { columns: 12 } },
    });
    (doc as unknown as Record<string, unknown>).pageEvents = {
      onLoad: [
        { type: "CallDataSource", dataSourceId: "ds1", resultKey: "r", requestKey: "rq1" },
      ],
    };

    const engine = createFormEngine(doc, {});
    const runner = makeRunner(engine, { dataSourceClient: mockClient });

    render(
      <ThemeProvider theme={theme}><CssBaseline />
        <PageRenderer doc={doc} engine={engine} registry={registry} mode="design" actionRunner={runner} />
      </ThemeProvider>
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(mockClient.execute).not.toHaveBeenCalled();
  });
});
