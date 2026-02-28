import type { FormDoc, FormNode } from "@ai-low-code/engine";

export type { FormDoc, FormNode };

export interface Diagnostic {
  code: string;
  message: string;
  nodeId?: string;
  path?: string;
}

export type Command =
  | { type: "UpdateProps"; nodeId: string; partialProps: Record<string, unknown> }
  | { type: "AddNode"; node: FormNode; parentId: string; index: number }
  | { type: "RemoveNode"; nodeId: string; deleteSubtree?: boolean }
  | { type: "MoveNode"; nodeId: string; parentId: string; index: number };

export interface ApplyResult {
  doc: FormDoc;
  diagnostics: Diagnostic[];
}
