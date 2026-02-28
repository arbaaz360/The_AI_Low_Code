import React, { useRef, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import { createFormEngine } from "@ai-low-code/engine";
import { Outline } from "./Outline.jsx";
import { Canvas } from "./Canvas.jsx";
import { Inspector } from "./Inspector.jsx";
import { useDocHistory } from "./useDocHistory.js";
import type { FormDoc, FormNode } from "@ai-low-code/engine";

const SECTION_TYPES = ["core.Section", "Section"];

/** Initial form.options and form.values for sample form */
const SAMPLE_INITIAL_VALUES: Record<string, unknown> = {
  form: {
    values: { accountType: "company" },
    options: {
      accountTypes: [
        { value: "company", label: "Company" },
        { value: "individual", label: "Individual" },
      ],
      industries: [
        { value: "tech", label: "Technology" },
        { value: "finance", label: "Finance" },
      ],
    },
  },
};

interface StudioAppProps {
  doc: FormDoc;
  onDocChange?: (doc: FormDoc) => void;
}

export function StudioApp({ doc: initialDoc, onDocChange }: StudioAppProps) {
  const { doc, apply, undo, redo, canUndo, canRedo } = useDocHistory(initialDoc);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const engineRef = useRef<ReturnType<typeof createFormEngine> | null>(null);
  const [engine, setEngine] = useState(() =>
    createFormEngine(initialDoc, {
      env: { region: "IN" },
      initialValues: SAMPLE_INITIAL_VALUES,
    })
  );
  engineRef.current = engine;

  useEffect(() => {
    onDocChange?.(doc);
  }, [doc, onDocChange]);

  const handleUpdateProps = (nodeId: string, partialProps: Record<string, unknown>) => {
    apply({ type: "UpdateProps", nodeId, partialProps });
  };

  const findParent = (nodeId: string): FormNode | null => {
    for (const node of Object.values(doc.nodes) as FormNode[]) {
      if (!node) continue;
      if ((node.children ?? []).includes(nodeId)) return node;
    }
    return null;
  };

  const getSelectedIndex = (): number => {
    if (!selectedNodeId) return -1;
    const parent = findParent(selectedNodeId);
    if (!parent) return -1;
    return (parent.children ?? []).indexOf(selectedNodeId);
  };

  const selectedNode = selectedNodeId ? (doc.nodes[selectedNodeId] as FormNode | undefined) : null;
  const isSection = selectedNode ? SECTION_TYPES.includes(selectedNode.type) : false;
  const parent = selectedNodeId ? findParent(selectedNodeId) : null;
  const selectedIndex = getSelectedIndex();
  const canMoveUp = parent && selectedIndex > 0;
  const canMoveDown = parent && selectedIndex >= 0 && selectedIndex < (parent.children?.length ?? 0) - 1;

  const handleAddSection = () => {
    const id = `section_${Date.now()}`;
    const node: FormNode = {
      id,
      type: "core.Section",
      children: [],
      props: { title: "New Section" },
    };
    apply({ type: "AddNode", node, parentId: doc.rootNodeId, index: (doc.nodes[doc.rootNodeId]?.children ?? []).length });
    setSelectedNodeId(id);
  };

  const handleAddTextInput = () => {
    const id = `textInput_${Date.now()}`;
    const node: FormNode = {
      id,
      type: "core.TextInput",
      bindings: { value: `form.values.${id}` },
    };
    const parentId = isSection ? selectedNodeId! : doc.rootNodeId;
    const parentNode = doc.nodes[parentId] as FormNode | undefined;
    const index = (parentNode?.children ?? []).length;
    apply({ type: "AddNode", node, parentId, index });
    setSelectedNodeId(id);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId || selectedNodeId === doc.rootNodeId) return;
    apply({ type: "RemoveNode", nodeId: selectedNodeId, deleteSubtree: true });
    setSelectedNodeId(null);
  };

  const handleMoveUp = () => {
    if (!selectedNodeId || !parent) return;
    apply({ type: "MoveNode", nodeId: selectedNodeId, parentId: parent.id, index: selectedIndex - 1 });
  };

  const handleMoveDown = () => {
    if (!selectedNodeId || !parent) return;
    apply({ type: "MoveNode", nodeId: selectedNodeId, parentId: parent.id, index: selectedIndex + 1 });
  };

  useEffect(() => {
    const eng = engineRef.current;
    const prevValues: Record<string, unknown> | undefined = eng
      ? (eng.store.getState() as { engine: { values: Record<string, unknown> } }).engine.values
      : undefined;
    const newEngine = createFormEngine(doc, {
      env: { region: "IN" },
      initialValues: prevValues ?? SAMPLE_INITIAL_VALUES,
    });
    setEngine(newEngine);
  }, [doc]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {selectedNodeId ?? "Form Designer"}
          </Typography>
          <Button
            data-testid="btn-add-section"
            color="inherit"
            size="small"
            onClick={handleAddSection}
          >
            Add Section
          </Button>
          <Button
            data-testid="btn-add-textinput"
            color="inherit"
            size="small"
            onClick={handleAddTextInput}
          >
            Add TextInput
          </Button>
          <Button
            data-testid="btn-delete-node"
            color="inherit"
            size="small"
            onClick={handleDeleteNode}
            disabled={!selectedNodeId || selectedNodeId === doc.rootNodeId}
          >
            Delete Node
          </Button>
          <IconButton
            data-testid="btn-move-up"
            color="inherit"
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            aria-label="Move up"
          >
            ▲
          </IconButton>
          <IconButton
            data-testid="btn-move-down"
            color="inherit"
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            aria-label="Move down"
          >
            ▼
          </IconButton>
          <Button
            data-testid="undo-btn"
            color="inherit"
            onClick={undo}
            disabled={!canUndo}
          >
            Undo
          </Button>
          <Button
            data-testid="redo-btn"
            color="inherit"
            onClick={redo}
            disabled={!canRedo}
          >
            Redo
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Paper
          elevation={0}
          sx={{
            width: 240,
            overflow: "auto",
            borderRight: 1,
            borderColor: "divider",
          }}
        >
          <Outline doc={doc} selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} />
        </Paper>
        <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <Canvas
            doc={doc}
            engine={engine}
            selectedNodeId={selectedNodeId}
            onSelect={setSelectedNodeId}
          />
        </Box>
        <Paper
          elevation={0}
          sx={{
            width: 280,
            overflow: "auto",
            borderLeft: 1,
            borderColor: "divider",
          }}
        >
          <Inspector
            doc={doc}
            selectedNodeId={selectedNodeId}
            onUpdateProps={handleUpdateProps}
          />
        </Paper>
      </Box>
    </Box>
  );
}
