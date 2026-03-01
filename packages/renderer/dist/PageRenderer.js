import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { NodeRenderer } from "./NodeRenderer.jsx";
import { ActionRunnerContext } from "./ActionRunnerContext.js";
function PageOnLoad({ doc, mode, actionRunner, }) {
    const ran = useRef(false);
    useEffect(() => {
        if (ran.current)
            return;
        if (mode !== "runtime" && mode !== "design")
            return;
        const onLoad = doc.pageEvents?.onLoad;
        if (!onLoad || onLoad.length === 0)
            return;
        if (mode === "design")
            return;
        ran.current = true;
        actionRunner.run(onLoad, {
            nodeId: "__page__",
            nodeType: "__page__",
            eventPayload: {},
            mode,
        });
    }, [doc, mode, actionRunner]);
    return null;
}
export function PageRenderer({ doc, engine, registry, mode = "runtime", actionRunner }) {
    const rootId = doc.rootNodeId;
    const content = (_jsxs(Provider, { store: engine.store, children: [actionRunner && (_jsx(PageOnLoad, { doc: doc, mode: mode ?? "runtime", actionRunner: actionRunner })), _jsx("div", { "data-renderer-mode": mode, children: _jsx(NodeRenderer, { nodeId: rootId, doc: doc, engine: engine, registry: registry, mode: mode }) })] }));
    if (actionRunner) {
        return (_jsx(ActionRunnerContext.Provider, { value: actionRunner, children: content }));
    }
    return content;
}
