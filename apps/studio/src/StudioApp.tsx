import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createFormEngine } from "@ai-low-code/engine";
import { isContainerType } from "@ai-low-code/studio-core";
import { Outline } from "./Outline.jsx";
import { Canvas } from "./Canvas.jsx";
import { Inspector } from "./Inspector.jsx";
import { DomainFieldsPanel } from "./DomainFieldsPanel.jsx";
import { DiagnosticsPanel } from "./DiagnosticsPanel.jsx";
import { useDocHistory } from "./useDocHistory.js";
import { processDragEnd } from "./dropHandling.js";
import { loadDomainModel, getEntityFields } from "./domainModel.js";
import { buildNodeFromDomainField, buildOptionsInitialValues } from "./buildNodeFromField.js";
import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { DomainField } from "./domainModel.js";

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
  /** For testing: inject domain model to skip fetch. Pass null to disable domain UI without fetch. */
  initialDomainModel?: Awaited<ReturnType<typeof loadDomainModel>> | null;
  /** URL to fetch domain model from (runtime only; ignored when initialDomainModel is provided) */
  domainModelUrl?: string;
}

export function StudioApp({
  doc: initialDoc,
  onDocChange,
  initialDomainModel,
  domainModelUrl,
}: StudioAppProps) {
  const { doc, apply, undo, redo, canUndo, canRedo, lastErrors, lastWarnings } = useDocHistory(initialDoc);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState(0);
  const [domainModel, setDomainModel] = useState<Awaited<ReturnType<typeof loadDomainModel>> | null>(null);
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

  useEffect(() => {
    if (initialDomainModel !== undefined) {
      setDomainModel(initialDomainModel ?? null);
      return;
    }
    let cancelled = false;
    loadDomainModel({ url: domainModelUrl })
      .then((m) => {
        if (!cancelled) setDomainModel(m);
      })
      .catch(() => {
        if (!cancelled) setDomainModel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [initialDomainModel, domainModelUrl]);

  useEffect(() => {
    if (selectedNodeId && !doc.nodes[selectedNodeId]) {
      setSelectedNodeId(null);
    }
  }, [doc, selectedNodeId]);

  const entityName = (doc.dataContext as { entity?: string } | undefined)?.entity;
  const domainFields = useMemo(
    () => (domainModel ? getEntityFields(domainModel, entityName) : []),
    [domainModel, entityName]
  );

  const boundFieldNames = useMemo(() => {
    const names = new Set<string>();
    for (const node of Object.values(doc.nodes) as FormNode[]) {
      if (!node?.bindings) continue;
      const valuePath = (node.bindings as Record<string, unknown>).value;
      if (typeof valuePath === "string") {
        const match = valuePath.match(/^form\.values\.(.+)$/);
        if (match) names.add(match[1]);
      }
    }
    return names;
  }, [doc]);

  const handleUpdateProps = (nodeId: string, partialProps: Record<string, unknown>) => {
    apply({ type: "UpdateProps", nodeId, partialProps });
  };

  const handleUpdateLayout = (nodeId: string, partialLayout: Record<string, unknown>) => {
    apply({ type: "UpdateLayout", nodeId, partialLayout });
  };

  const handleUpdateBindings = (nodeId: string, partialBindings: Record<string, unknown>) => {
    apply({ type: "UpdateBindings", nodeId, partialBindings });
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
    const target = resolveInsertTarget();
    if (!target) return;
    const id = `textInput_${Date.now()}`;
    const node: FormNode = {
      id,
      type: "core.TextInput",
      bindings: { value: `form.values.${id}` },
    };
    apply({ type: "AddNode", node, parentId: target.parentId, index: target.index });
    setSelectedNodeId(id);
  };

  const resolveInsertTarget = (): { parentId: string; index: number } | null => {
    const rootNode = doc.nodes[doc.rootNodeId] as FormNode | undefined;
    if (!rootNode) return null;
    if (!selectedNodeId) {
      return { parentId: doc.rootNodeId, index: (rootNode.children ?? []).length };
    }
    const sel = doc.nodes[selectedNodeId] as FormNode | undefined;
    if (!sel) return { parentId: doc.rootNodeId, index: (rootNode.children ?? []).length };
    if (isContainerType(sel.type)) {
      return { parentId: selectedNodeId, index: (sel.children ?? []).length };
    }
    const p = findParent(selectedNodeId);
    if (!p) return { parentId: doc.rootNodeId, index: (rootNode.children ?? []).length };
    const idx = (p.children ?? []).indexOf(selectedNodeId) + 1;
    return { parentId: p.id, index: idx };
  };

  const handleAddDomainField = (field: DomainField) => {
    const target = resolveInsertTarget();
    if (!target) return;
    const node = buildNodeFromDomainField(field);
    apply({ type: "AddNode", node, parentId: target.parentId, index: target.index });
    setSelectedNodeId(node.id);
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      processDragEnd(doc, event, apply, {
        selectedNodeId,
        setSelectedNodeId,
      });
    },
    [doc, apply, selectedNodeId]
  );

  useEffect(() => {
    const eng = engineRef.current;
    const prevValues: Record<string, unknown> | undefined = eng
      ? (eng.store.getState() as { engine: { values: Record<string, unknown> } }).engine.values
      : undefined;
    const base = prevValues ?? SAMPLE_INITIAL_VALUES;
    const opts = buildOptionsInitialValues(domainFields);
    const formOpts =
      (base.form as Record<string, unknown>)?.options ?? ({} as Record<string, unknown>);
    const mergedOptions = { ...formOpts, ...opts };
    const initialValues: Record<string, unknown> = {
      ...base,
      form: {
        ...(base.form as Record<string, unknown>),
        options: mergedOptions,
      },
    };
    const newEngine = createFormEngine(doc, {
      env: { region: "IN" },
      initialValues,
    });
    setEngine(newEngine);
  }, [doc, domainFields]);

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
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Paper
            elevation={0}
            sx={{
              width: 240,
              overflow: "hidden",
              borderRight: 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Tabs value={leftTab} onChange={(_, v) => setLeftTab(v)} variant="fullWidth">
              <Tab label="Outline" data-testid="tab-outline" />
              <Tab label="Domain Fields" data-testid="tab-domain-fields" />
            </Tabs>
            <Box sx={{ flex: 1, overflow: "auto" }}>
              {leftTab === 0 && (
                <Outline doc={doc} selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} />
              )}
              {leftTab === 1 && (
                <DomainFieldsPanel
                  fields={domainFields}
                  entityName={entityName ?? ""}
                  boundFieldNames={boundFieldNames}
                  onAddField={handleAddDomainField}
                />
              )}
            </Box>
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
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <Inspector
              doc={doc}
              selectedNodeId={selectedNodeId}
              domainFields={domainFields}
              onUpdateProps={handleUpdateProps}
              onUpdateLayout={handleUpdateLayout}
              onUpdateBindings={handleUpdateBindings}
            />
          </Box>
          <DiagnosticsPanel
            errors={lastErrors}
            warnings={lastWarnings}
            onSelectNode={setSelectedNodeId}
          />
        </Paper>
        </Box>
      </DndContext>
    </Box>
  );
}
