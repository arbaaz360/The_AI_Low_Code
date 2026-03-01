import type { FormDoc, FormNode } from "@ai-low-code/engine";
import type { Command, ApplyResult, Diagnostic } from "./types.js";
import { validateInvariants } from "./invariants.js";
import { canContain } from "./constraints.js";
import { isDescendant } from "./dropResolution.js";
import { clampSpan } from "./layoutValidation.js";

function err(code: string, message: string, opts?: { nodeId?: string; path?: string }): Diagnostic {
  return { code, message, severity: "error", ...opts };
}

/**
 * Applies a command to the doc. Returns new doc and any diagnostics.
 * Does not mutate the input doc.
 */
export function applyCommand(doc: FormDoc, command: Command): ApplyResult {
  let newDoc: FormDoc;
  const diagnostics: Diagnostic[] = [];

  switch (command.type) {
    case "UpdateProps":
      newDoc = applyUpdateProps(doc, command.nodeId, command.partialProps);
      break;
    case "UpdateLayout":
      newDoc = applyUpdateLayout(doc, command.nodeId, command.partialLayout);
      break;
    case "UpdateBindings":
      newDoc = applyUpdateBindings(doc, command.nodeId, command.partialBindings);
      break;
    case "UpdateEvents":
      newDoc = applyUpdateEvents(doc, command.nodeId, command.events);
      break;
    case "AddNode": {
      const parent = doc.nodes[command.parentId];
      if (!parent) {
        diagnostics.push(err("ADD_NODE_PARENT_MISSING", `Parent "${command.parentId}" does not exist`, {
          nodeId: command.node.id,
          path: `nodes.${command.parentId}`,
        }));
        return { doc, diagnostics };
      }
      if (!canContain(parent.type, command.node.type)) {
        diagnostics.push(err("CONSTRAINT_CANNOT_CONTAIN", `Parent type "${parent.type}" cannot contain "${command.node.type}"`, {
          nodeId: command.node.id,
          path: `nodes.${command.parentId}`,
        }));
        return { doc, diagnostics };
      }
      newDoc = applyAddNode(doc, command.node, command.parentId, command.index);
      break;
    }
    case "RemoveNode":
      newDoc = applyRemoveNode(doc, command.nodeId, command.deleteSubtree ?? true);
      if (command.nodeId === doc.rootNodeId) {
        diagnostics.push(err("REMOVE_NODE_ROOT", "Cannot remove root node", { nodeId: command.nodeId }));
        return { doc, diagnostics };
      }
      break;
    case "MoveNode": {
      const newParent = doc.nodes[command.parentId] as FormNode | undefined;
      const movingNode = doc.nodes[command.nodeId] as FormNode | undefined;
      if (!newParent || !movingNode) {
        if (!newParent) {
          diagnostics.push(err("MOVE_NODE_PARENT_MISSING", `Target parent "${command.parentId}" does not exist`, { nodeId: command.nodeId }));
        }
        return { doc, diagnostics };
      }
      if (!canContain(newParent.type, movingNode.type)) {
        diagnostics.push(err("CONSTRAINT_CANNOT_CONTAIN", `Parent type "${newParent.type}" cannot contain "${movingNode.type}"`, {
          nodeId: command.nodeId,
          path: `nodes.${command.parentId}`,
        }));
        return { doc, diagnostics };
      }
      if (isDescendant(doc, command.nodeId, command.parentId)) {
        diagnostics.push(err("MOVE_INTO_SUBTREE", "Cannot move a node into its own subtree", {
          nodeId: command.nodeId,
          path: `nodes.${command.parentId}`,
        }));
        return { doc, diagnostics };
      }
      newDoc = applyMoveNode(doc, command.nodeId, command.parentId, command.index);
      break;
    }
    case "SetDataSources":
      newDoc = { ...doc, dataSources: command.dataSources };
      break;
    case "SetPageEvents":
      newDoc = { ...doc, pageEvents: command.pageEvents };
      break;
    default: {
      const _: never = command;
      return { doc, diagnostics: [] };
    }
  }

  const invariantDiag = validateInvariants(newDoc);
  const allDiag = [...diagnostics, ...invariantDiag];
  const hasErrors = allDiag.some((d) => d.severity === "error");
  return {
    doc: hasErrors ? doc : newDoc,
    diagnostics: allDiag,
  };
}

function applyUpdateProps(
  doc: FormDoc,
  nodeId: string,
  partialProps: Record<string, unknown>
): FormDoc {
  const node = doc.nodes[nodeId];
  if (!node) return doc;

  const mergedProps = { ...(node.props ?? {}), ...partialProps };
  const newNode: FormNode = { ...node, props: mergedProps };
  const newNodes = { ...doc.nodes, [nodeId]: newNode };
  return { ...doc, nodes: newNodes };
}

function applyUpdateBindings(
  doc: FormDoc,
  nodeId: string,
  partialBindings: Record<string, unknown>
): FormDoc {
  const node = doc.nodes[nodeId];
  if (!node) return doc;

  const merged = { ...(node.bindings ?? {}), ...partialBindings } as Record<string, unknown>;
  const newNode: FormNode = { ...node, bindings: merged };
  const newNodes = { ...doc.nodes, [nodeId]: newNode };
  return { ...doc, nodes: newNodes };
}

function applyUpdateLayout(
  doc: FormDoc,
  nodeId: string,
  partialLayout: Record<string, unknown>
): FormDoc {
  const node = doc.nodes[nodeId];
  if (!node) return doc;

  const currentLayout = (node.layout ?? {}) as Record<string, unknown>;
  const currentSpan = (currentLayout.span ?? {}) as Record<string, number>;
  const partialSpan = (partialLayout.span ?? {}) as Record<string, unknown>;

  const newSpan: Record<string, number> = { ...currentSpan };
  if (partialSpan.xs !== undefined) newSpan.xs = clampSpan(Number(partialSpan.xs));
  if (partialSpan.md !== undefined) {
    const mdVal = partialSpan.md;
    if (mdVal === null || mdVal === "" || mdVal === undefined) {
      delete newSpan.md;
    } else {
      newSpan.md = clampSpan(Number(mdVal));
    }
  }

  const merged: Record<string, unknown> = {
    ...currentLayout,
    ...partialLayout,
    kind: "gridItem",
    span: newSpan,
  };

  const newNode: FormNode = { ...node, layout: merged };
  const newNodes = { ...doc.nodes, [nodeId]: newNode };
  return { ...doc, nodes: newNodes };
}

function applyUpdateEvents(
  doc: FormDoc,
  nodeId: string,
  events: Record<string, unknown[]>
): FormDoc {
  const node = doc.nodes[nodeId];
  if (!node) return doc;

  const merged = { ...(node.events ?? {}), ...events } as FormNode["events"];
  const newNode: FormNode = { ...node, events: merged };
  const newNodes = { ...doc.nodes, [nodeId]: newNode };
  return { ...doc, nodes: newNodes };
}

function applyAddNode(doc: FormDoc, node: FormNode, parentId: string, index: number): FormDoc {
  const parent = doc.nodes[parentId];
  if (!parent) return doc;

  const children = [...(parent.children ?? [])];
  const safeIndex = Math.max(0, Math.min(index, children.length));
  children.splice(safeIndex, 0, node.id);

  const newParent: FormNode = { ...parent, children };
  const newNodes = {
    ...doc.nodes,
    [parentId]: newParent,
    [node.id]: node,
  };
  return { ...doc, nodes: newNodes };
}

function collectSubtreeIds(doc: FormDoc, nodeId: string): Set<string> {
  const result = new Set<string>([nodeId]);
  const node = doc.nodes[nodeId];
  if (!node) return result;
  for (const cid of node.children ?? []) {
    for (const id of collectSubtreeIds(doc, cid)) {
      result.add(id);
    }
  }
  return result;
}

function applyRemoveNode(doc: FormDoc, nodeId: string, deleteSubtree: boolean): FormDoc {
  if (nodeId === doc.rootNodeId) return doc;

  const toRemove = deleteSubtree ? collectSubtreeIds(doc, nodeId) : new Set([nodeId]);
  const parent = findParentNode(doc, nodeId);
  if (!parent) return doc;

  const newNodes = { ...doc.nodes };
  for (const id of toRemove) {
    delete newNodes[id];
  }

  const newParent = { ...parent };
  newParent.children = (parent.children ?? []).filter((cid) => !toRemove.has(cid));
  newNodes[parent.id] = newParent;

  return { ...doc, nodes: newNodes };
}

function findParentNode(doc: FormDoc, nodeId: string): FormNode | null {
  for (const node of Object.values(doc.nodes) as FormNode[]) {
    if (!node) continue;
    if ((node.children ?? []).includes(nodeId)) return node;
  }
  return null;
}

function applyMoveNode(doc: FormDoc, nodeId: string, parentId: string, index: number): FormDoc {
  const oldParent = findParentNode(doc, nodeId);
  if (!oldParent) return doc;

  const newParent = doc.nodes[parentId] as FormNode | undefined;
  if (!newParent) return doc;

  // Remove from old parent
  const oldChildren = [...(oldParent.children ?? [])];
  const oldIdx = oldChildren.indexOf(nodeId);
  if (oldIdx === -1) return doc;
  oldChildren.splice(oldIdx, 1);

  const newNodes = { ...doc.nodes };
  newNodes[oldParent.id] = { ...oldParent, children: oldChildren };

  // Insert into new parent - use already-modified children when same parent
  const baseChildren =
    oldParent.id === parentId ? newNodes[parentId]!.children ?? [] : newParent.children ?? [];
  const newChildren = [...baseChildren];
  const safeIndex = Math.max(0, Math.min(index, newChildren.length));
  newChildren.splice(safeIndex, 0, nodeId);

  newNodes[parentId] = { ...newNodes[parentId] ?? newParent, children: newChildren };

  return { ...doc, nodes: newNodes };
}
