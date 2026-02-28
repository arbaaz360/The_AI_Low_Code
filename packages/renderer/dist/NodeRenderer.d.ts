import type { FormDoc } from "@ai-low-code/engine";
import type { FormEngine } from "@ai-low-code/engine";
import type { WidgetRegistry } from "./types.js";
interface NodeRendererProps {
    nodeId: string;
    doc: FormDoc;
    engine: FormEngine;
    registry: WidgetRegistry;
    mode: "runtime" | "design";
}
export declare function NodeRenderer({ nodeId, doc, engine, registry, mode }: NodeRendererProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=NodeRenderer.d.ts.map