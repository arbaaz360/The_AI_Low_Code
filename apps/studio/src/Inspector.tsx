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

const BINDABLE_WIDGET_TYPES = ["core.TextInput", "core.Checkbox", "core.Select"];

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

interface InspectorProps {
  doc: FormDoc;
  selectedNodeId: string | null;
  domainFields?: DomainField[];
  onUpdateProps: (nodeId: string, partialProps: Record<string, unknown>) => void;
  onUpdateLayout?: (nodeId: string, partialLayout: Record<string, unknown>) => void;
  onUpdateBindings?: (nodeId: string, partialBindings: Record<string, unknown>) => void;
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

  if (!schema || schema.fields.length === 0) {
    return (
      <Box data-testid="inspector" sx={{ p: 2, minWidth: 220 }}>
        {baseInfo}
        {bindingSection}
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
      </Box>
    );
  }

  return (
    <Box data-testid="inspector" sx={{ p: 2, minWidth: 220 }}>
      {baseInfo}
      {bindingSection}
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
    </Box>
  );
}
