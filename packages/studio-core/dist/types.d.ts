import type { FormDoc, FormNode } from "@ai-low-code/engine";
export type { FormDoc, FormNode };
export type DiagnosticSeverity = "error" | "warn";
export interface Diagnostic {
    code: string;
    message: string;
    severity: DiagnosticSeverity;
    nodeId?: string;
    path?: string;
}
export type Command = {
    type: "UpdateProps";
    nodeId: string;
    partialProps: Record<string, unknown>;
} | {
    type: "UpdateLayout";
    nodeId: string;
    partialLayout: Record<string, unknown>;
} | {
    type: "UpdateBindings";
    nodeId: string;
    partialBindings: Record<string, unknown>;
} | {
    type: "UpdateEvents";
    nodeId: string;
    events: Record<string, unknown[]>;
} | {
    type: "AddNode";
    node: FormNode;
    parentId: string;
    index: number;
} | {
    type: "RemoveNode";
    nodeId: string;
    deleteSubtree?: boolean;
} | {
    type: "MoveNode";
    nodeId: string;
    parentId: string;
    index: number;
} | {
    type: "SetDataSources";
    dataSources: FormDoc["dataSources"];
} | {
    type: "SetPageEvents";
    pageEvents: FormDoc["pageEvents"];
};
export interface ApplyResult {
    doc: FormDoc;
    diagnostics: Diagnostic[];
}
//# sourceMappingURL=types.d.ts.map