import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { validateFormDoc } from "@ai-low-code/schema";
import { StudioApp } from "./StudioApp.jsx";
import { TEST_DOMAIN_MODEL_NONE } from "./test-utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(resolve(__dirname, "../../../samples/form_rules.json"), "utf-8")
);

const result = validateFormDoc(doc);
if (!result.ok) throw new Error(JSON.stringify(result.errors));

const theme = createTheme();

describe("StudioApp add/delete smoke", () => {
  it("adds a Section via Widget Palette, verifies Outline grows", async () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    const outlineText = screen.getAllByTestId("outline")[0]!.textContent;

    await act(async () => {
      fireEvent.click(screen.getByTestId("btn-add-widget"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("palette-layout.Section"));
    });

    const newOutlineText = screen.getAllByTestId("outline")[0]!.textContent;
    expect(newOutlineText!.length).toBeGreaterThan(outlineText!.length);
  });
});
