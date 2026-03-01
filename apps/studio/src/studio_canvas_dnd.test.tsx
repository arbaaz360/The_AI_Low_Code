import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import { validateFormDoc } from "@ai-low-code/schema";
import { useDocHistory } from "./useDocHistory.js";
import { processDragEnd } from "./dropHandling.js";
import type { DragEndEvent } from "@dnd-kit/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(
  readFileSync(resolve(__dirname, "../../../samples/form_rules.json"), "utf-8")
);

const result = validateFormDoc(doc);
if (!result.ok) throw new Error(JSON.stringify(result.errors));

const theme = createTheme();

describe("Studio Canvas DnD", () => {
  it("onDragEnd canvas-inside: taxId becomes last child of companyFields", () => {
    const { result } = renderHook(() => useDocHistory(doc), {
      wrapper: ({ children }) => (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      ),
    });

    const event: DragEndEvent = {
      active: { id: "taxId", data: { current: {} }, rect: { current: null } },
      over: { id: "canvas-inside-companyFields", data: { current: {} }, rect: { current: null }, disabled: false },
      delta: { x: 0, y: 0 },
      collisions: null,
    };

    act(() => {
      processDragEnd(result.current.doc, event, result.current.apply, {
        selectedNodeId: null,
        setSelectedNodeId: () => {},
      });
    });

    const updated = result.current.doc;
    const companyFields = updated.nodes.companyFields as { children?: string[] };
    expect(companyFields.children).toEqual(["companyName", "industry", "taxId"]);
  });
});
