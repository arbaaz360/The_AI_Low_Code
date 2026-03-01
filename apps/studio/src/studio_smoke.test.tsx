import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("StudioApp smoke", () => {
  it("renders StudioApp and asserts Outline, Canvas, Inspector exist", () => {
    render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <StudioApp doc={doc} initialDomainModel={TEST_DOMAIN_MODEL_NONE} />
      </ThemeProvider>
    );

    expect(screen.getByTestId("outline")).toBeInTheDocument();
    expect(screen.getByTestId("canvas")).toBeInTheDocument();
    expect(screen.getByTestId("inspector")).toBeInTheDocument();
  });
});
