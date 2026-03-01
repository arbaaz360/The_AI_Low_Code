import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import type { FormDoc, FormNode } from "@ai-low-code/engine";
import { getPropSchema } from "@ai-low-code/widgets-core";
import type { PropSchemaField } from "@ai-low-code/studio-core";
import { clampSpan, isGridContainerType } from "@ai-low-code/studio-core";
import type { DomainField } from "./domainModel.js";
import { EventEditor } from "./EventEditor.jsx";

const BINDABLE_WIDGET_TYPES = [
  "core.TextInput", "core.TextArea", "core.NumberInput", "core.DateInput",
  "core.Checkbox", "core.Switch", "core.Select", "core.RadioGroup",
];

function parseValuePath(path: string | undefined): string | null {
  if (typeof path !== "string") return null;
  const m = path.match(/^form\.values\.(.+)$/);
  return m ? m[1] : null;
}

function findParent(doc: FormDoc, nodeId: string): FormNode | null {
  for (const node of Object.values(doc.nodes) as FormNode[]) {
    if (!node || !(node.children ?? []).includes(nodeId)) continue;
    return node;
  }
  return null;
}

function isGridContainerChild(doc: FormDoc, nodeId: string): boolean {
  const parent = findParent(doc, nodeId);
  return parent !== null && isGridContainerType(parent.type);
}

function getSpanValue(layout: Record<string, unknown> | undefined, key: "xs" | "md"): number | undefined {
  if (!layout?.span || typeof layout.span !== "object") return undefined;
  const span = layout.span as Record<string, number>;
  const v = span[key];
  return v !== undefined && Number.isInteger(v) ? v : undefined;
}

type DataSourceDefMeta = NonNullable<FormDoc["dataSources"]>[number];

interface InspectorProps {
  doc: FormDoc;
  selectedNodeId: string | null;
  domainFields?: DomainField[];
  onUpdateProps: (nodeId: string, partialProps: Record<string, unknown>) => void;
  onUpdateLayout?: (nodeId: string, partialLayout: Record<string, unknown>) => void;
  onUpdateBindings?: (nodeId: string, partialBindings: Record<string, unknown>) => void;
  onUpdateEvents?: (nodeId: string, events: Record<string, unknown[]>) => void;
  onBindOptionsToDataSource?: (nodeId: string, dataSourceId: string, resultKey: string) => void;
}

function getFieldValue(props: Record<string, unknown> | undefined, field: PropSchemaField): unknown {
  const val = props?.[field.key];
  if (val !== undefined) return val;
  return field.default;
}

function PropControl({
  field,
  value,
  onChange,
}: {
  field: PropSchemaField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const strVal = String(value ?? "");

  if (field.type === "enum" && field.options) {
    return (
      <FormControl size="small" fullWidth sx={{ mb: 1 }}>
        <InputLabel>{field.label}</InputLabel>
        <Select
          value={strVal || "__empty__"}
          label={field.label}
          onChange={(e) => onChange(e.target.value === "__empty__" ? undefined : e.target.value)}
          data-testid={`inspector-prop-${field.key}`}
        >
          {field.optional && <MenuItem value="__empty__">(none)</MenuItem>}
          {field.options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  if (field.type === "number") {
    return (
      <TextField
        label={field.label}
        size="small"
        fullWidth
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") { onChange(undefined); return; }
          const n = Number(raw);
          onChange(Number.isNaN(n) ? undefined : n);
        }}
        inputProps={{ "data-testid": `inspector-prop-${field.key}` }}
        sx={{ mb: 1 }}
      />
    );
  }

  return (
    <TextField
      label={field.label}
      size="small"
      fullWidth
      value={strVal}
      onChange={(e) => onChange(e.target.value)}
      inputProps={{ "data-testid": `inspector-prop-${field.key}` }}
      sx={{ mb: 1 }}
    />
  );
}

export function Inspector({
  doc,
  selectedNodeId,
  domainFields = [],
  onUpdateProps,
  onUpdateLayout,
  onUpdateBindings,
  onUpdateEvents,
  onBindOptionsToDataSource,
}: InspectorProps) {
  const node = selectedNodeId ? (doc.nodes[selectedNodeId] as FormNode | undefined) : null;
  const schema = node ? getPropSchema(node.type) : null;
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [layoutSpanXs, setLayoutSpanXs] = useState<number>(12);
  const [layoutSpanMd, setLayoutSpanMd] = useState<number | "">(12);
  const showLayoutSection = node && selectedNodeId && isGridContainerChild(doc, selectedNodeId);

  useEffect(() => {
    if (node && schema) {
      const vals: Record<string, unknown> = {};
      for (const field of schema.fields) {
        vals[field.key] = getFieldValue(node.props as Record<string, unknown>, field);
      }
      setLocalValues(vals);
    }
  }, [node, schema]);

  useEffect(() => {
    if (node && showLayoutSection) {
      const layout = node.layout as Record<string, unknown> | undefined;
      const xs = getSpanValue(layout, "xs") ?? 12;
      const md = getSpanValue(layout, "md");
      setLayoutSpanXs(xs);
      setLayoutSpanMd(md !== undefined ? md : "");
    }
  }, [node, showLayoutSection]);

  if (!selectedNodeId || !node) {
    return (
      <Box data-testid="inspector" sx={{ p: 2 }}>
        <Typography color="text.secondary">Select a node</Typography>
      </Box>
    );
  }

  const baseInfo = (
    <>
      <Typography variant="subtitle2" color="text.secondary">
        Node ID
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {node.id}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary">
        Type
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {node.type}
      </Typography>
    </>
  );

  const showBindingSection =
    domainFields.length > 0 &&
    onUpdateBindings &&
    BINDABLE_WIDGET_TYPES.includes(node.type);
  const currentBindingField = parseValuePath(
    (node.bindings as Record<string, unknown>)?.value as string
  );

  const handleBindingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v === "__none__") return;
    const field = domainFields.find((f) => f.name === v);
    if (!field) return;
    onUpdateBindings!(selectedNodeId!, { value: `form.values.${field.name}` });
    const label = (node.props as Record<string, unknown>)?.label;
    if ((label === undefined || label === "" || label === null) && field.displayName) {
      onUpdateProps(selectedNodeId!, { label: field.displayName });
    }
  };

  const bindingSelectValue =
    domainFields.some((f) => f.name === currentBindingField) ? currentBindingField! : "__none__";

  const bindingSection = showBindingSection && (
    <>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        Binding
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
          Domain field
        </Typography>
        <select
          key={`binding-${bindingSelectValue}`}
          defaultValue={bindingSelectValue}
          data-testid="inspector-binding-field"
          onChange={handleBindingChange}
          style={{ width: "100%", padding: "6px 8px", fontSize: "0.875rem" }}
        >
          <option value="__none__">(none)</option>
          {domainFields.map((f) => (
            <option key={f.name} value={f.name}>
              {f.displayName ?? f.name}
            </option>
          ))}
        </select>
      </Box>
    </>
  );

  const dataSources = (doc.dataSources ?? []) as DataSourceDefMeta[];
  const isSelectLike = node.type === "core.Select" || node.type === "core.RadioGroup";
  const currentOptionsBinding = typeof node.bindings?.options === "string" ? node.bindings.options : undefined;
  const currentBoundDsKey =
    currentOptionsBinding?.startsWith("data.byKey.")
      ? currentOptionsBinding.slice("data.byKey.".length)
      : undefined;

  const dataSourceBindSection = isSelectLike && dataSources.length > 0 && onBindOptionsToDataSource && (
    <>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
        Options DataSource
      </Typography>
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Bind options from</InputLabel>
        <Select
          value={currentBoundDsKey ?? "__none__"}
          label="Bind options from"
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__none__") return;
            const ds = dataSources.find((d) => d.id === v);
            if (!ds) return;
            const resultKey = ds.id;
            onBindOptionsToDataSource(selectedNodeId, ds.id, resultKey);
          }}
          data-testid="inspector-ds-bind"
        >
          <MenuItem value="__none__">(none)</MenuItem>
          {dataSources.map((ds) => (
            <MenuItem key={ds.id} value={ds.id}>
              {ds.name || ds.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );

  const eventsSection = onUpdateEvents && (
    <EventEditor
      nodeType={node.type}
      events={node.events as Record<string, unknown[]> | undefined}
      onUpdateEvents={(events) => onUpdateEvents(selectedNodeId, events)}
    />
  );

  if (!schema || schema.fields.length === 0) {
    return (
      <Box data-testid="inspector" sx={{ p: 2, minWidth: 220 }}>
        {baseInfo}
      {bindingSection}
      {dataSourceBindSection}
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        No editable props for this type
      </Typography>
        {showLayoutSection && onUpdateLayout && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
              Layout
            </Typography>
            <TextField
              label="span.xs"
              size="small"
              type="number"
              inputProps={{ min: 1, max: 12, "data-testid": "inspector-layout-span-xs" }}
              value={layoutSpanXs}
              onChange={(e) => {
                const v = clampSpan(Number(e.target.value) || 1);
                setLayoutSpanXs(v);
                onUpdateLayout(selectedNodeId!, { span: { xs: v } });
              }}
              sx={{ mb: 1 }}
              fullWidth
            />
            <TextField
              label="span.md (optional)"
              size="small"
              type="number"
              inputProps={{ min: 1, max: 12, "data-testid": "inspector-layout-span-md" }}
              value={layoutSpanMd}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") {
                  setLayoutSpanMd("");
                  onUpdateLayout(selectedNodeId!, { span: { md: null } });
                  return;
                }
                const v = clampSpan(Number(raw) || 1);
                setLayoutSpanMd(v);
                onUpdateLayout(selectedNodeId!, { span: { md: v } });
              }}
              sx={{ mb: 1 }}
              fullWidth
              placeholder="(same as xs)"
            />
          </>
        )}
        {eventsSection}
      </Box>
    );
  }

  return (
    <Box data-testid="inspector" sx={{ p: 2, minWidth: 220 }}>
      {baseInfo}
      {bindingSection}
      {dataSourceBindSection}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        Props
      </Typography>
      {schema.fields.map((field) => (
        <PropControl
          key={field.key}
          field={field}
          value={localValues[field.key]}
          onChange={(v) => {
            const next = { ...localValues, [field.key]: v };
            setLocalValues(next);
            onUpdateProps(selectedNodeId, { [field.key]: v });
          }}
        />
      ))}
      {showLayoutSection && onUpdateLayout && (
        <>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
            Layout
          </Typography>
          <TextField
            label="span.xs"
            size="small"
            type="number"
            inputProps={{ min: 1, max: 12, "data-testid": "inspector-layout-span-xs" }}
            value={layoutSpanXs}
            onChange={(e) => {
              const v = clampSpan(Number(e.target.value) || 1);
              setLayoutSpanXs(v);
              onUpdateLayout(selectedNodeId!, { span: { xs: v } });
            }}
            sx={{ mb: 1 }}
            fullWidth
          />
          <TextField
            label="span.md (optional)"
            size="small"
            type="number"
            inputProps={{ min: 1, max: 12, "data-testid": "inspector-layout-span-md" }}
            value={layoutSpanMd}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                setLayoutSpanMd("");
                onUpdateLayout(selectedNodeId!, { span: { md: null } });
                return;
              }
              const v = clampSpan(Number(raw) || 1);
              setLayoutSpanMd(v);
              onUpdateLayout(selectedNodeId!, { span: { md: v } });
            }}
            sx={{ mb: 1 }}
            fullWidth
            placeholder="(same as xs)"
          />
        </>
      )}
      {eventsSection}
    </Box>
  );
}
