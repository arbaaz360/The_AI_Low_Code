import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { useDocHistory } from "./useDocHistory.js";
import { DiagnosticsPanel } from "./DiagnosticsPanel.jsx";

const theme = createTheme();

const docWithLeaf = {
  schemaVersion: "1.0",
  pageFamily: "Form",
  rootNodeId: "root",
  nodes: {
    root: {
      id: "root",
      type: "FormGrid",
      layout: { columns: 12 },
      children: ["sec", "leaf"],
    },
    sec: {
      id: "sec",
      type: "core.Section",
      children: [],
      props: { title: "S" },
    },
    leaf: {
      id: "leaf",
      type: "core.TextInput",
      bindings: { value: "form.values.x" },
    },
  },
  dataContext: { entity: "Test", mode: "create" },
  submission: { submitOperation: { operationId: "test" }, mapping: [] },
};

function TestHarness() {
  const { apply, lastErrors } = useDocHistory(docWithLeaf);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <button onClick={() => apply({ type: "MoveNode", nodeId: "sec", parentId: "leaf", index: 0 })}>
        Trigger invalid move
      </button>
      <DiagnosticsPanel errors={lastErrors} warnings={[]} onSelectNode={setSelected} />
      <span data-testid="selected">{selected ?? "none"}</span>
    </ThemeProvider>
  );
}

describe("Studio Diagnostics panel", () => {
  it("trigger invalid move creates diagnostic, panel renders, clicking selects nodeId", () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByText("Trigger invalid move"));

    expect(screen.getByTestId("diagnostics-panel")).toBeInTheDocument();
    const diagnosticItem = screen.getByTestId("diagnostic-sec");
    expect(diagnosticItem).toBeInTheDocument();

    fireEvent.click(diagnosticItem);
    expect(screen.getByTestId("selected")).toHaveTextContent("sec");
  });

});
