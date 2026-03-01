import { validateInvariants } from "./invariants.js";
import { canContain } from "./constraints.js";
import { isDescendant } from "./dropResolution.js";
import { clampSpan } from "./layoutValidation.js";
function err(code, message, opts) {
    return { code, message, severity: "error", ...opts };
}
/**
 * Applies a command to the doc. Returns new doc and any diagnostics.
 * Does not mutate the input doc.
 */
export function applyCommand(doc, command) {
    let newDoc;
    const diagnostics = [];
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
            const newParent = doc.nodes[command.parentId];
            const movingNode = doc.nodes[command.nodeId];
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
            const _ = command;
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
function applyUpdateProps(doc, nodeId, partialProps) {
    const node = doc.nodes[nodeId];
    if (!node)
        return doc;
    const mergedProps = { ...(node.props ?? {}), ...partialProps };
    const newNode = { ...node, props: mergedProps };
    const newNodes = { ...doc.nodes, [nodeId]: newNode };
    return { ...doc, nodes: newNodes };
}
function applyUpdateBindings(doc, nodeId, partialBindings) {
    const node = doc.nodes[nodeId];
    if (!node)
        return doc;
    const merged = { ...(node.bindings ?? {}), ...partialBindings };
    const newNode = { ...node, bindings: merged };
    const newNodes = { ...doc.nodes, [nodeId]: newNode };
    return { ...doc, nodes: newNodes };
}
function applyUpdateLayout(doc, nodeId, partialLayout) {
    const node = doc.nodes[nodeId];
    if (!node)
        return doc;
    const currentLayout = (node.layout ?? {});
    const currentSpan = (currentLayout.span ?? {});
    const partialSpan = (partialLayout.span ?? {});
    const newSpan = { ...currentSpan };
    if (partialSpan.xs !== undefined)
        newSpan.xs = clampSpan(Number(partialSpan.xs));
    if (partialSpan.md !== undefined) {
        const mdVal = partialSpan.md;
        if (mdVal === null || mdVal === "" || mdVal === undefined) {
            delete newSpan.md;
        }
        else {
            newSpan.md = clampSpan(Number(mdVal));
        }
    }
    const merged = {
        ...currentLayout,
        ...partialLayout,
        kind: "gridItem",
        span: newSpan,
    };
    const newNode = { ...node, layout: merged };
    const newNodes = { ...doc.nodes, [nodeId]: newNode };
    return { ...doc, nodes: newNodes };
}
function applyUpdateEvents(doc, nodeId, events) {
    const node = doc.nodes[nodeId];
    if (!node)
        return doc;
    const merged = { ...(node.events ?? {}), ...events };
    const newNode = { ...node, events: merged };
    const newNodes = { ...doc.nodes, [nodeId]: newNode };
    return { ...doc, nodes: newNodes };
}
function applyAddNode(doc, node, parentId, index) {
    const parent = doc.nodes[parentId];
    if (!parent)
        return doc;
    const children = [...(parent.children ?? [])];
    const safeIndex = Math.max(0, Math.min(index, children.length));
    children.splice(safeIndex, 0, node.id);
    const newParent = { ...parent, children };
    const newNodes = {
        ...doc.nodes,
        [parentId]: newParent,
        [node.id]: node,
    };
    return { ...doc, nodes: newNodes };
}
function collectSubtreeIds(doc, nodeId) {
    const result = new Set([nodeId]);
    const node = doc.nodes[nodeId];
    if (!node)
        return result;
    for (const cid of node.children ?? []) {
        for (const id of collectSubtreeIds(doc, cid)) {
            result.add(id);
        }
    }
    return result;
}
function applyRemoveNode(doc, nodeId, deleteSubtree) {
    if (nodeId === doc.rootNodeId)
        return doc;
    const toRemove = deleteSubtree ? collectSubtreeIds(doc, nodeId) : new Set([nodeId]);
    const parent = findParentNode(doc, nodeId);
    if (!parent)
        return doc;
    const newNodes = { ...doc.nodes };
    for (const id of toRemove) {
        delete newNodes[id];
    }
    const newParent = { ...parent };
    newParent.children = (parent.children ?? []).filter((cid) => !toRemove.has(cid));
    newNodes[parent.id] = newParent;
    return { ...doc, nodes: newNodes };
}
function findParentNode(doc, nodeId) {
    for (const node of Object.values(doc.nodes)) {
        if (!node)
            continue;
        if ((node.children ?? []).includes(nodeId))
            return node;
    }
    return null;
}
function applyMoveNode(doc, nodeId, parentId, index) {
    const oldParent = findParentNode(doc, nodeId);
    if (!oldParent)
        return doc;
    const newParent = doc.nodes[parentId];
    if (!newParent)
        return doc;
    // Remove from old parent
    const oldChildren = [...(oldParent.children ?? [])];
    const oldIdx = oldChildren.indexOf(nodeId);
    if (oldIdx === -1)
        return doc;
    oldChildren.splice(oldIdx, 1);
    const newNodes = { ...doc.nodes };
    newNodes[oldParent.id] = { ...oldParent, children: oldChildren };
    // Insert into new parent - use already-modified children when same parent
    const baseChildren = oldParent.id === parentId ? newNodes[parentId].children ?? [] : newParent.children ?? [];
    const newChildren = [...baseChildren];
    const safeIndex = Math.max(0, Math.min(index, newChildren.length));
    newChildren.splice(safeIndex, 0, nodeId);
    newNodes[parentId] = { ...newNodes[parentId] ?? newParent, children: newChildren };
    return { ...doc, nodes: newNodes };
}
