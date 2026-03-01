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
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
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
import { createActionRunner, type ActionRunner, type ActionError } from "@ai-low-code/actions";
import { createDataSourceRegistry, createDataSourceClient } from "@ai-low-code/datasources";
import {
  dataRequestStarted, dataRequestSucceeded, dataRequestFailed, dataSetByKey,
  applyFieldErrors, clearFieldErrors, setFormError, setSubmitting,
} from "@ai-low-code/engine";
import { evalAst } from "@ai-low-code/expr";
import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { DomainField } from "./domainModel.js";
import { DataSourcesPanel } from "./DataSourcesPanel.jsx";
import { PublishPanel } from "./PublishPanel.jsx";
import { mockFetch } from "./mockFetch.js";
import { validateGovernance, type GovIssue } from "@ai-low-code/governance";
import { migrateFormDoc } from "@ai-low-code/migrations";
import { validateFormDoc } from "@ai-low-code/schema";

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

interface WidgetPaletteItem {
  type: string;
  label: string;
  isContainer: boolean;
}

const WIDGET_PALETTE: WidgetPaletteItem[] = [
  { type: "layout.Section", label: "Section", isContainer: true },
  { type: "layout.Stack", label: "Stack", isContainer: true },
  { type: "core.TextInput", label: "Text Input", isContainer: false },
  { type: "core.TextArea", label: "Text Area", isContainer: false },
  { type: "core.NumberInput", label: "Number Input", isContainer: false },
  { type: "core.DateInput", label: "Date Input", isContainer: false },
  { type: "core.Select", label: "Select", isContainer: false },
  { type: "core.Checkbox", label: "Checkbox", isContainer: false },
  { type: "core.Switch", label: "Switch", isContainer: false },
  { type: "core.RadioGroup", label: "Radio Group", isContainer: false },
  { type: "core.Button", label: "Button", isContainer: false },
];

interface StudioAppProps {
  doc: FormDoc;
  onDocChange?: (doc: FormDoc) => void;
  initialDomainModel?: Awaited<ReturnType<typeof loadDomainModel>> | null;
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
  const [canvasMode, setCanvasMode] = useState<"design" | "runtime">("design");
  const [domainModel, setDomainModel] = useState<Awaited<ReturnType<typeof loadDomainModel>> | null>(null);
  const [paletteAnchor, setPaletteAnchor] = useState<HTMLElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createFormEngine> | null>(null);
  const [engine, setEngine] = useState(() =>
    createFormEngine(initialDoc, {
      env: { region: "IN" },
      initialValues: SAMPLE_INITIAL_VALUES,
    })
  );
  engineRef.current = engine;

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastSeverity, setToastSeverity] = useState<"success" | "info" | "warning" | "error">("info");
  const [lastActionError, setLastActionError] = useState<ActionError | null>(null);
  const [lastNav, setLastNav] = useState<string | null>(null);

  const govResult = useMemo(() => validateGovernance(doc), [doc]);
  const govDiagErrors = useMemo(() =>
    govResult.errors.map((e) => ({
      code: e.code,
      message: e.message,
      severity: "error" as const,
      nodeId: e.nodeId,
      path: e.path,
    })),
    [govResult.errors]
  );
  const govDiagWarnings = useMemo(() =>
    govResult.warnings.map((w) => ({
      code: w.code,
      message: w.message,
      severity: "warning" as const,
      nodeId: w.nodeId,
      path: w.path,
    })),
    [govResult.warnings]
  );
  const allDiagErrors = useMemo(() => [...lastErrors, ...govDiagErrors], [lastErrors, govDiagErrors]);
  const allDiagWarnings = useMemo(() => [...lastWarnings, ...govDiagWarnings], [lastWarnings, govDiagWarnings]);

  const dsClient = useMemo(() => {
    const defs = (doc.dataSources ?? []).map((d) => {
      if (d.kind === "rest") {
        return { id: d.id, kind: "rest" as const, name: d.name, method: (d.method ?? "GET") as "GET" | "POST", url: d.url ?? "" };
      }
      return { id: d.id, kind: "mock" as const, name: d.name, response: d.response, delayMs: d.delayMs, failRate: d.failRate };
    });
    const registry = createDataSourceRegistry(defs);
    return createDataSourceClient({ registry, fetchImpl: mockFetch });
  }, [doc.dataSources]);

  const actionRunner: ActionRunner = useMemo(() => {
    return createActionRunner({
      dispatch: (a) => engine.store.dispatch(a),
      getState: () => engine.store.getState() as { engine: { values: Record<string, unknown>; errorsByPath: Record<string, string[]>; data: { byKey: Record<string, unknown> } } },
      setValueActionCreator: (p) => engine.actions.setValue(p),
      dataRequestStartedCreator: (p) => dataRequestStarted(p),
      dataRequestSucceededCreator: (p) => dataRequestSucceeded(p),
      dataRequestFailedCreator: (p) => dataRequestFailed(p),
      dataSetByKeyCreator: (p) => dataSetByKey(p),
      applyFieldErrorsCreator: (p) => applyFieldErrors(p),
      clearFieldErrorsCreator: () => clearFieldErrors(),
      setFormErrorCreator: (p) => setFormError(p),
      setSubmittingCreator: (p) => setSubmitting(p),
      dataSourceClient: dsClient,
      validateAll: () => engine.validateAll(),
      buildSubmitRequest: () => engine.buildSubmitRequest(),
      evalExpr: (ast, ctx) => evalAst(ast, ctx),
      navigate: (to) => {
        setLastNav(to);
        setToastMsg(`Navigate: ${to}`);
        setToastSeverity("info");
        setToastOpen(true);
      },
      toast: (opts) => {
        setToastMsg(opts.message);
        setToastSeverity((opts.severity as "success" | "info" | "warning" | "error") ?? "info");
        setToastOpen(true);
      },
      telemetry: {
        onActionStart: (action, ctx) => console.log(`[Action] ${action.type} start`, ctx.nodeId),
        onActionEnd: (action) => console.log(`[Action] ${action.type} end`),
        onActionError: (action, ctx, err) => {
          console.error(`[Action] ${action.type} error`, err);
          if (typeof err === "object" && err !== null && "message" in err) {
            setLastActionError(err as ActionError);
          }
        },
      },
    });
  }, [engine, dsClient]);

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
  const handleUpdateEvents = (nodeId: string, events: Record<string, unknown[]>) => {
    apply({ type: "UpdateEvents", nodeId, events });
  };

  const handleBindOptionsToDataSource = (nodeId: string, dataSourceId: string, resultKey: string) => {
    apply({ type: "UpdateBindings", nodeId, partialBindings: { options: `data.byKey.${resultKey}` } });

    const existing = (doc.pageEvents?.onLoad ?? []) as Array<{ type: string; dataSourceId?: string; resultKey?: string }>;
    const alreadyBound = existing.some(
      (a) => a.type === "CallDataSource" && a.dataSourceId === dataSourceId && a.resultKey === resultKey
    );
    if (!alreadyBound) {
      const newOnLoad = [
        ...existing,
        { type: "CallDataSource", dataSourceId, resultKey },
      ];
      apply({ type: "SetPageEvents", pageEvents: { onLoad: newOnLoad } });
    }
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
    const p = findParent(selectedNodeId);
    if (!p) return -1;
    return (p.children ?? []).indexOf(selectedNodeId);
  };

  const parent = selectedNodeId ? findParent(selectedNodeId) : null;
  const selectedIndex = getSelectedIndex();
  const canMoveUp = parent && selectedIndex > 0;
  const canMoveDown = parent && selectedIndex >= 0 && selectedIndex < (parent.children?.length ?? 0) - 1;

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

  const handleAddWidget = (item: WidgetPaletteItem) => {
    setPaletteAnchor(null);
    const target = item.isContainer
      ? { parentId: doc.rootNodeId, index: (doc.nodes[doc.rootNodeId]?.children ?? []).length }
      : resolveInsertTarget();
    if (!target) return;
    const suffix = Date.now();
    const shortName = item.type.split(".").pop()!.toLowerCase();
    const id = `${shortName}_${suffix}`;
    const node: FormNode = {
      id,
      type: item.type,
      ...(item.isContainer ? { children: [], props: item.type.includes("Section") ? { title: "New Section" } : {} } : {}),
      ...(!item.isContainer ? { bindings: { value: `form.values.${id}` } } : {}),
    };
    apply({ type: "AddNode", node, parentId: target.parentId, index: target.index });
    setSelectedNodeId(id);
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

  const handleExportJson = () => {
    const schemaResult = validateFormDoc(doc);
    const gov = validateGovernance(doc);
    if (!schemaResult.ok || !gov.ok) {
      setToastMsg(`Export blocked: ${[...schemaResult.errors.map((e) => e.message), ...gov.errors.map((e) => e.message)].slice(0, 3).join("; ")}`);
      setToastSeverity("error");
      setToastOpen(true);
      return;
    }
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form_doc.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2)).catch(() => {});
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      processDragEnd(doc, event, apply, { selectedNodeId, setSelectedNodeId });
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
    const formOpts = (base.form as Record<string, unknown>)?.options ?? ({} as Record<string, unknown>);
    const mergedOptions = { ...formOpts, ...opts };
    const initialValues: Record<string, unknown> = {
      ...base,
      form: { ...(base.form as Record<string, unknown>), options: mergedOptions },
    };
    const newEngine = createFormEngine(doc, { env: { region: "IN" }, initialValues });
    setEngine(newEngine);
  }, [doc, domainFields]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1} sx={{ zIndex: 10 }}>
        <Toolbar variant="dense" sx={{ gap: 0.5, minHeight: 48 }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "0.9rem" }} noWrap>
            {selectedNodeId ? `${doc.nodes[selectedNodeId]?.type ?? ""} (${selectedNodeId})` : "Form Designer"}
          </Typography>

          <Button
            data-testid="btn-add-widget"
            color="inherit"
            size="small"
            onClick={(e) => setPaletteAnchor(e.currentTarget)}
          >
            + Add Widget
          </Button>
          <Menu
            anchorEl={paletteAnchor}
            open={Boolean(paletteAnchor)}
            onClose={() => setPaletteAnchor(null)}
            data-testid="widget-palette-menu"
          >
            <MenuItem disabled><ListItemText primaryTypographyProps={{ variant: "caption", color: "text.secondary" }}>Containers</ListItemText></MenuItem>
            {WIDGET_PALETTE.filter((w) => w.isContainer).map((item) => (
              <MenuItem key={item.type} onClick={() => handleAddWidget(item)} data-testid={`palette-${item.type}`}>
                <ListItemText>{item.label}</ListItemText>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem disabled><ListItemText primaryTypographyProps={{ variant: "caption", color: "text.secondary" }}>Inputs</ListItemText></MenuItem>
            {WIDGET_PALETTE.filter((w) => !w.isContainer).map((item) => (
              <MenuItem key={item.type} onClick={() => handleAddWidget(item)} data-testid={`palette-${item.type}`}>
                <ListItemText>{item.label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>

          <Button data-testid="btn-delete-node" color="inherit" size="small" onClick={handleDeleteNode} disabled={!selectedNodeId || selectedNodeId === doc.rootNodeId}>
            Delete
          </Button>
          <IconButton data-testid="btn-move-up" color="inherit" size="small" onClick={handleMoveUp} disabled={!canMoveUp} aria-label="Move up">▲</IconButton>
          <IconButton data-testid="btn-move-down" color="inherit" size="small" onClick={handleMoveDown} disabled={!canMoveDown} aria-label="Move down">▼</IconButton>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: "rgba(255,255,255,0.2)" }} />
          <Button data-testid="undo-btn" color="inherit" size="small" onClick={undo} disabled={!canUndo}>Undo</Button>
          <Button data-testid="redo-btn" color="inherit" size="small" onClick={redo} disabled={!canRedo}>Redo</Button>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: "rgba(255,255,255,0.2)" }} />
          <Button color="inherit" size="small" onClick={handleExportJson} data-testid="btn-export-json">Export</Button>
          <Button color="inherit" size="small" onClick={handleCopyJson} data-testid="btn-copy-json">Copy</Button>
        </Toolbar>
      </AppBar>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleDragEnd}>
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Left panel */}
          <Paper
            sx={{
              width: 250,
              overflow: "hidden",
              borderRight: 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              borderRadius: 0,
            }}
          >
            <Tabs value={leftTab} onChange={(_, v) => setLeftTab(v)} variant="fullWidth">
              <Tab label="Outline" data-testid="tab-outline" />
              <Tab label="Fields" data-testid="tab-domain-fields" />
              <Tab label="Data" data-testid="tab-datasources" />
            </Tabs>
            <Box sx={{ flex: 1, overflow: "auto" }}>
              {leftTab === 0 && <Outline doc={doc} selectedNodeId={selectedNodeId} onSelect={setSelectedNodeId} />}
              {leftTab === 1 && (
                <DomainFieldsPanel fields={domainFields} entityName={entityName ?? ""} boundFieldNames={boundFieldNames} onAddField={handleAddDomainField} />
              )}
              {leftTab === 2 && (
                <DataSourcesPanel
                  dataSources={(doc.dataSources ?? []) as NonNullable<FormDoc["dataSources"]>}
                  onUpdate={(dataSources) => apply({ type: "SetDataSources", dataSources })}
                />
              )}
            </Box>
          </Paper>

          {/* Center canvas */}
          <Box sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.5, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
              <ToggleButtonGroup
                size="small"
                value={canvasMode}
                exclusive
                onChange={(_, v) => {
                  if (!v) return;
                  if (v === "runtime" && !govResult.ok) {
                    setToastMsg("Preview blocked: fix governance errors first");
                    setToastSeverity("error");
                    setToastOpen(true);
                    return;
                  }
                  setCanvasMode(v);
                }}
                data-testid="canvas-mode-toggle"
              >
                <ToggleButton value="design" sx={{ px: 1.5, py: 0.25, fontSize: "0.75rem" }}>Design</ToggleButton>
                <ToggleButton value="runtime" sx={{ px: 1.5, py: 0.25, fontSize: "0.75rem" }}>Preview</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {canvasMode === "runtime" ? "Runtime preview — read-only" : "Design mode — click to select, drag to reorder"}
              </Typography>
            </Box>
            <Canvas
              doc={doc}
              engine={engine}
              selectedNodeId={canvasMode === "design" ? selectedNodeId : null}
              onSelect={canvasMode === "design" ? setSelectedNodeId : () => {}}
              mode={canvasMode}
              actionRunner={canvasMode === "runtime" ? actionRunner : undefined}
            />
          </Box>

          {/* Right panel */}
          <Paper
            sx={{
              width: 280,
              overflow: "auto",
              borderLeft: 1,
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              borderRadius: 0,
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
                onUpdateEvents={handleUpdateEvents}
                onBindOptionsToDataSource={handleBindOptionsToDataSource}
              />
            </Box>
            <DiagnosticsPanel errors={allDiagErrors} warnings={allDiagWarnings} onSelectNode={setSelectedNodeId} />
            <PublishPanel doc={doc} />
          </Paper>
        </Box>
      </DndContext>
      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={toastSeverity} onClose={() => setToastOpen(false)} variant="filled" sx={{ width: "100%" }}>
          {toastMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
