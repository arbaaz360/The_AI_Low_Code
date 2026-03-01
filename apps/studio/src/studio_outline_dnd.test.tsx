import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { validateFormDoc } from "@ai-low-code/schema";
import { StudioApp } from "./StudioApp.jsx";
import { Outline } from "./Outline.jsx";
import { useDocHistory } from "./useDocHistory.js";
import { TEST_DOMAIN_MODEL_NONE } from "./test-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(resolve(__dirname, "../../../samples/form_rules.json"), "utf-8")
);

const result = validateFormDoc(doc);
if (!result.ok) throw new Error(JSON.stringify(result.errors));

const theme = createTheme();

describe("Studio Outline DnD", () => {
  it("legal move via buttons: order changes", () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText(/Section \(companyFields\)/));
    fireEvent.click(screen.getByTestId("btn-move-down"));

    const outline = screen.getByTestId("outline");
    const text = outline.textContent ?? "";
    const idxIndividual = text.indexOf("individualFields");
    const idxCompany = text.indexOf("companyFields");
    expect(idxIndividual).toBeLessThan(idxCompany);
  });

  it("Outline exposes drag handles for non-root nodes", () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Outline doc={doc} selectedNodeId={null} onSelect={() => {}} />
      </ThemeProvider>
    );
    expect(screen.getAllByTestId("outline-drag-handle-companyFields").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTestId("outline-drag-handle-accountType").length).toBeGreaterThanOrEqual(1);
  });

  it("onMoveNode with illegal target (into leaf): apply refuses, lastErrors set, diagnostics banner", () => {
    const docWithLeaf = {
      ...doc,
      nodes: {
        ...doc.nodes,
        root: { ...doc.nodes.root, children: ["sec", "leaf"] },
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
      dataContext: doc.dataContext,
      submission: doc.submission,
      schemaVersion: doc.schemaVersion,
      pageFamily: doc.pageFamily,
      rules: doc.rules ?? [],
    };

    const { result } = renderHook(() => useDocHistory(docWithLeaf), {
      wrapper: ({ children }) => (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      ),
    });

    act(() => {
      result.current.apply({
        type: "MoveNode",
        nodeId: "sec",
        parentId: "leaf",
        index: 0,
      });
    });

    expect(result.current.lastErrors.length).toBeGreaterThan(0);
    expect(result.current.lastErrors.some((e) => e.code === "CONSTRAINT_CANNOT_CONTAIN")).toBe(true);
    expect(result.current.doc).toBe(docWithLeaf);
  });
});
