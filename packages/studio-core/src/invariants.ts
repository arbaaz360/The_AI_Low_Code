import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { Diagnostic } from "./types.js";

function err(code: string, message: string, opts?: { nodeId?: string; path?: string }): Diagnostic {
  return { code, message, severity: "error", ...opts };
}

/**
 * Validates doc invariants: root exists, children exist, no cycles, keys match ids.
 * Returns diagnostics for any violations.
 */
export function validateInvariants(doc: FormDoc): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const { nodes, rootNodeId } = doc;

  // rootNodeId exists in nodes
  if (!nodes[rootNodeId]) {
    diagnostics.push(err("INVARIANT_ROOT_MISSING", `rootNodeId "${rootNodeId}" does not exist in nodes`, { path: "rootNodeId" }));
  }

  // nodes map keys match node.id
  for (const [key, node] of Object.entries(nodes)) {
    if (!node) continue;
    if (node.id !== key) {
      diagnostics.push(err("INVARIANT_KEY_MISMATCH", `nodes["${key}"].id (${node.id}) does not match key`, { nodeId: node.id, path: `nodes.${key}.id` }));
    }
  }

  // all children IDs exist in nodes; no cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function visit(nodeId: string, path: string[]): void {
    if (path.includes(nodeId)) {
      diagnostics.push(err("INVARIANT_CYCLE", `Cycle detected: ${path.join(" -> ")} -> ${nodeId}`, { nodeId, path: path.join(".") }));
      return;
    }
    if (recursionStack.has(nodeId)) return;
    recursionStack.add(nodeId);
    visited.add(nodeId);

    const node = nodes[nodeId];
    if (!node) {
      recursionStack.delete(nodeId);
      return;
    }

    const children = node.children ?? [];
    for (let i = 0; i < children.length; i++) {
      const childId = children[i]!;
      if (!nodes[childId]) {
        diagnostics.push(err("INVARIANT_MISSING_CHILD", `Node "${nodeId}" references missing child "${childId}" at index ${i}`, { nodeId, path: `nodes.${nodeId}.children.${i}` }));
      } else {
        visit(childId, [...path, nodeId]);
      }
    }
    recursionStack.delete(nodeId);
  }

  if (nodes[rootNodeId]) {
    visit(rootNodeId, []);
  }

  // no orphan nodes (every node except root is a child of some node)
  const referenced = new Set<string>();
  referenced.add(rootNodeId);
  for (const node of Object.values(nodes) as FormNode[]) {
    if (!node) continue;
    for (const cid of node.children ?? []) {
      referenced.add(cid);
    }
  }
  for (const nodeId of Object.keys(nodes)) {
    if (nodeId === rootNodeId) continue;
    if (!referenced.has(nodeId)) {
      diagnostics.push(err("INVARIANT_ORPHAN", `Node "${nodeId}" is not referenced by any parent (orphan)`, { nodeId, path: `nodes.${nodeId}` }));
    }
  }

  return diagnostics;
}
