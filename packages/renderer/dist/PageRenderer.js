import { jsx as _jsx } from "react/jsx-runtime";
import { Provider } from "react-redux";
import { NodeRenderer } from "./NodeRenderer.jsx";
export function PageRenderer({ doc, engine, registry, mode = "runtime" }) {
    const rootId = doc.rootNodeId;
    return (_jsx(Provider, { store: engine.store, children: _jsx("div", { "data-renderer-mode": mode, children: _jsx(NodeRenderer, { nodeId: rootId, doc: doc, engine: engine, registry: registry, mode: mode }) }) }));
}
