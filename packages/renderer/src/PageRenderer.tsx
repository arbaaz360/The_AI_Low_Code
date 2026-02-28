import { Provider } from "react-redux";
import { NodeRenderer } from "./NodeRenderer.jsx";
import type { RendererProps } from "./types.js";

export function PageRenderer({ doc, engine, registry, mode = "runtime" }: RendererProps) {
  const rootId = doc.rootNodeId;
  return (
    <Provider store={engine.store}>
      <div data-renderer-mode={mode}>
        <NodeRenderer
          nodeId={rootId}
          doc={doc}
          engine={engine}
          registry={registry}
          mode={mode}
        />
      </div>
    </Provider>
  );
}
