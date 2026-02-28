import { useSelector } from "react-redux";
import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { FormEngine } from "@ai-low-code/engine";
import type { WidgetRegistry } from "./types.js";

interface NodeRendererProps {
  nodeId: string;
  doc: FormDoc;
  engine: FormEngine;
  registry: WidgetRegistry;
  mode: "runtime" | "design";
}

function humanize(id: string): string {
  return id.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

export function NodeRenderer({ nodeId, doc, engine, registry, mode }: NodeRendererProps) {
  const node = doc.nodes[nodeId] as FormNode | undefined;
  if (!node) return null;

  const visible = useSelector(engine.selectors.makeSelectNodeVisible(nodeId));
  const disabled = useSelector(engine.selectors.makeSelectNodeDisabled(nodeId));

  if (!visible) return null;

  const valuePath = typeof node.bindings?.value === "string" ? node.bindings.value : undefined;
  const optionsPath = typeof node.bindings?.options === "string" ? node.bindings.options : undefined;
  const value = valuePath
    ? useSelector(engine.selectors.makeSelectValue(valuePath))
    : undefined;
  const options = optionsPath
    ? useSelector(engine.selectors.makeSelectValue(optionsPath))
    : undefined;
  const errors = valuePath
    ? useSelector(engine.selectors.makeSelectError(valuePath))
    : [];

  const Widget = registry[node.type];
  if (!Widget) {
    return (
      <div data-nodeid={mode === "design" ? nodeId : undefined} data-nodetype={mode === "design" ? node.type : undefined}>
        [Unknown: {node.type}]
      </div>
    );
  }

  const handleChange = valuePath
    ? (v: unknown) => engine.actions.setValue({ path: valuePath, value: v })
    : undefined;

  const widgetProps = {
    nodeId,
    nodeType: node.type,
    props: node.props,
    layout: node.layout,
    doc,
    value,
    onChange: handleChange,
    disabled,
    error: errors,
    label: (typeof node.bindings?.label === "string" ? node.bindings.label : undefined) ?? humanize(node.id),
    options,
    mode,
  };

  if (node.children && node.children.length > 0) {
    return (
      <Widget
        {...widgetProps}
        children={node.children.map((cid) => (
          <NodeRenderer
            key={cid}
            nodeId={cid}
            doc={doc}
            engine={engine}
            registry={registry}
            mode={mode}
          />
        ))}
      />
    );
  }

  return (
    <Widget {...widgetProps} />
  );
}
