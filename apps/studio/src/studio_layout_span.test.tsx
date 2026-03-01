import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { validateFormDoc } from "@ai-low-code/schema";
import { StudioApp } from "./StudioApp.jsx";
import { TEST_DOMAIN_MODEL_NONE } from "./test-utils.js";
import type { FormDoc } from "@ai-low-code/engine";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(resolve(__dirname, "../../../samples/form_basic.json"), "utf-8")
);

const result = validateFormDoc(doc);
if (!result.ok) throw new Error(JSON.stringify(result.errors));

const theme = createTheme();

function getSpanXs(d: FormDoc, nodeId: string): number | undefined {
  const node = d.nodes[nodeId] as { layout?: { span?: { xs?: number } } };
  return node?.layout?.span?.xs;
}

describe("Studio layout span editing", () => {
  it("select TextInput under FormGrid, edit span.xs to 6, doc updated, undo/redo restores", async () => {
    let lastDoc: FormDoc = doc;
    const capture = (d: FormDoc) => {
      lastDoc = d;
    };

    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} onDocChange={capture} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    // Select f1 (TextInput, direct child of FormGrid root)
    fireEvent.click(screen.getByText(/core\.TextInput \(f1\)/));

    // Layout section should show (FormGrid child)
    const xsInput = screen.getByTestId("inspector-layout-span-xs");
    expect(xsInput).toBeInTheDocument();
    expect((xsInput as HTMLInputElement).value).toBe("12");

    // Edit span.xs to 6
    fireEvent.change(xsInput, { target: { value: "6" } });

    await waitFor(() => {
      expect(getSpanXs(lastDoc, "f1")).toBe(6);
    });

    // Undo restores
    fireEvent.click(screen.getByTestId("undo-btn"));
    await waitFor(() => {
      expect(getSpanXs(lastDoc, "f1")).toBeUndefined();
    });

    // Redo re-applies
    fireEvent.click(screen.getByTestId("redo-btn"));
    await waitFor(() => {
      expect(getSpanXs(lastDoc, "f1")).toBe(6);
    });
  });
});
