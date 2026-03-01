import { useEffect, useRef } from "react";
import { Provider, useSelector } from "react-redux";
import Alert from "@mui/material/Alert";
import { NodeRenderer } from "./NodeRenderer.jsx";
import { ActionRunnerContext } from "./ActionRunnerContext.js";
import type { Action } from "@ai-low-code/actions";
import type { ActionRunner } from "@ai-low-code/actions";
import type { RendererProps } from "./types.js";
import type { FormDoc, FormEngine } from "@ai-low-code/engine";

function PageOnLoad({
  doc,
  mode,
  actionRunner,
}: {
  doc: FormDoc;
  mode: "runtime" | "design";
  actionRunner: ActionRunner;
}) {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    if (mode !== "runtime" && mode !== "design") return;
    const onLoad = doc.pageEvents?.onLoad;
    if (!onLoad || onLoad.length === 0) return;
    if (mode === "design") return;
    ran.current = true;
    actionRunner.run(onLoad as Action[], {
      nodeId: "__page__",
      nodeType: "__page__",
      eventPayload: {},
      mode,
    });
  }, [doc, mode, actionRunner]);
  return null;
}

function FormErrorBanner({ engine }: { engine: FormEngine }) {
  const selector = engine.selectors.selectFormError;
  const formError = useSelector(selector ?? (() => undefined));
  if (!formError) return null;
  return <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>;
}

export function PageRenderer({ doc, engine, registry, mode = "runtime", actionRunner }: RendererProps) {
  const rootId = doc.rootNodeId;
  const content = (
    <Provider store={engine.store}>
      {actionRunner && (
        <PageOnLoad doc={doc} mode={mode ?? "runtime"} actionRunner={actionRunner} />
      )}
      <FormErrorBanner engine={engine} />
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

  if (actionRunner) {
    return (
      <ActionRunnerContext.Provider value={actionRunner}>
        {content}
      </ActionRunnerContext.Provider>
    );
  }

  return content;
}
