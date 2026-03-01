import type { GovIssue, GovernanceResult } from "./types.js";
import {
  CANONICAL_WIDGET_TYPES,
  LEGACY_WIDGET_ALIASES,
  ALLOWED_ACTION_TYPES,
  ALLOWED_EVENT_NAMES,
  ALLOWED_SETVALUE_PATH_PREFIXES,
  ALLOWED_VALUE_BINDING_PREFIX,
  ALLOWED_OPTIONS_BINDING_PREFIXES,
  ALLOWED_EXPR_OPS,
  KNOWN_PROP_KEYS,
  MAX_EXPR_DEPTH,
  MAX_EXPR_NODE_COUNT,
  MAX_NODES,
  MAX_DOC_BYTES,
} from "./constants.js";

interface DocLike {
  nodes?: Record<string, NodeLike>;
  pageEvents?: { onLoad?: ActionLike[] };
  [key: string]: unknown;
}

interface NodeLike {
  id: string;
  type: string;
  props?: Record<string, unknown>;
  bindings?: Record<string, unknown>;
  events?: Record<string, unknown[]>;
  children?: string[];
  [key: string]: unknown;
}

interface ActionLike {
  type?: string;
  path?: string;
  actions?: ActionLike[];
  then?: ActionLike[];
  else?: ActionLike[];
  onError?: ActionLike[];
  onSuccess?: ActionLike[];
  condition?: ExprLike;
  args?: ExprLike;
  value?: unknown;
  message?: unknown;
  to?: unknown;
  [key: string]: unknown;
}

interface ExprLike {
  op?: string;
  left?: ExprLike;
  right?: ExprLike;
  args?: ExprLike[];
  then?: ExprLike;
  else?: ExprLike;
  path?: string;
  [key: string]: unknown;
}

function isExprLike(v: unknown): v is ExprLike {
  return v != null && typeof v === "object" && "op" in (v as Record<string, unknown>);
}

function measureExpr(expr: ExprLike, depth: number): { maxDepth: number; nodeCount: number } {
  let maxD = depth;
  let count = 1;
  const children: (ExprLike | undefined)[] = [expr.left, expr.right, expr.then, expr.else];
  if (expr.args) children.push(...expr.args);
  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const sub = measureExpr(child, depth + 1);
    if (sub.maxDepth > maxD) maxD = sub.maxDepth;
    count += sub.nodeCount;
  }
  return { maxDepth: maxD, nodeCount: count };
}

function validateExprOps(expr: ExprLike, issues: GovIssue[], path: string): void {
  if (expr.op && !ALLOWED_EXPR_OPS.has(expr.op)) {
    issues.push({ severity: "error", code: "GOV_EXPR_UNKNOWN_OP", message: `Unknown expression op "${expr.op}"`, path });
  }
  const children: (ExprLike | undefined)[] = [expr.left, expr.right, expr.then, expr.else];
  if (expr.args) children.push(...expr.args);
  for (const child of children) {
    if (child && typeof child === "object" && "op" in child) {
      validateExprOps(child, issues, path);
    }
  }
}

function validateActions(actions: ActionLike[], issues: GovIssue[], basePath: string, nodeId?: string): void {
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i]!;
    const aPath = `${basePath}[${i}]`;
    if (!a.type || !ALLOWED_ACTION_TYPES.has(a.type)) {
      issues.push({ severity: "error", code: "GOV_ACTION_UNKNOWN", message: `Unknown action type "${a.type ?? "(missing)"}"`, nodeId, path: aPath });
    }
    if (a.type === "SetValue" && typeof a.path === "string") {
      if (!ALLOWED_SETVALUE_PATH_PREFIXES.some((p) => a.path!.startsWith(p))) {
        issues.push({ severity: "error", code: "GOV_ACTION_BAD_PATH", message: `SetValue path "${a.path}" not in allowlist`, nodeId, path: aPath });
      }
    }
    if (a.condition && isExprLike(a.condition)) {
      validateExprOps(a.condition, issues, `${aPath}.condition`);
    }
    if (a.args && isExprLike(a.args)) {
      validateExprOps(a.args, issues, `${aPath}.args`);
    }
    if (a.value && isExprLike(a.value)) {
      validateExprOps(a.value as ExprLike, issues, `${aPath}.value`);
    }
    if (a.message && isExprLike(a.message)) {
      validateExprOps(a.message as ExprLike, issues, `${aPath}.message`);
    }
    if (a.to && isExprLike(a.to)) {
      validateExprOps(a.to as ExprLike, issues, `${aPath}.to`);
    }
    if (a.actions) validateActions(a.actions, issues, `${aPath}.actions`, nodeId);
    if (a.then) validateActions(a.then as ActionLike[], issues, `${aPath}.then`, nodeId);
    if (a.else) validateActions(a.else as ActionLike[], issues, `${aPath}.else`, nodeId);
    if (a.onError) validateActions(a.onError, issues, `${aPath}.onError`, nodeId);
    if (a.onSuccess) validateActions(a.onSuccess, issues, `${aPath}.onSuccess`, nodeId);
  }
}

export function validateGovernance(doc: unknown): GovernanceResult {
  const errors: GovIssue[] = [];
  const warnings: GovIssue[] = [];

  if (!doc || typeof doc !== "object") {
    errors.push({ severity: "error", code: "GOV_INVALID_DOC", message: "Document is not an object" });
    return { errors, warnings, ok: false };
  }

  const docBytes = JSON.stringify(doc).length;
  if (docBytes > MAX_DOC_BYTES) {
    errors.push({ severity: "error", code: "GOV_DOC_TOO_LARGE", message: `Document is ${docBytes} bytes (max ${MAX_DOC_BYTES})` });
  }

  const d = doc as DocLike;
  const nodes = d.nodes ?? {};
  const nodeEntries = Object.entries(nodes);

  if (nodeEntries.length > MAX_NODES) {
    errors.push({ severity: "error", code: "GOV_TOO_MANY_NODES", message: `Document has ${nodeEntries.length} nodes (max ${MAX_NODES})` });
  }

  for (const [nodeId, node] of nodeEntries) {
    if (!node || typeof node !== "object") continue;
    const n = node as NodeLike;

    const isCanonical = CANONICAL_WIDGET_TYPES.has(n.type);
    const isLegacy = LEGACY_WIDGET_ALIASES[n.type] !== undefined;
    if (!isCanonical && !isLegacy) {
      errors.push({ severity: "error", code: "GOV_WIDGET_UNKNOWN", message: `Unknown widget type "${n.type}"`, nodeId, path: `nodes.${nodeId}.type` });
    } else if (isLegacy && !isCanonical) {
      warnings.push({ severity: "warning", code: "GOV_WIDGET_LEGACY", message: `Legacy widget type "${n.type}" — use "${LEGACY_WIDGET_ALIASES[n.type]}"`, nodeId, path: `nodes.${nodeId}.type` });
    }

    const resolvedType = isLegacy ? LEGACY_WIDGET_ALIASES[n.type]! : n.type;
    const knownProps = KNOWN_PROP_KEYS[resolvedType];
    if (knownProps && n.props) {
      for (const key of Object.keys(n.props)) {
        if (!knownProps.has(key)) {
          warnings.push({ severity: "warning", code: "GOV_PROP_UNKNOWN", message: `Unknown prop "${key}" on ${n.type}`, nodeId, path: `nodes.${nodeId}.props.${key}` });
        }
      }
    }

    if (n.bindings) {
      const bindings = n.bindings as Record<string, unknown>;
      if (typeof bindings.value === "string") {
        if (!bindings.value.startsWith(ALLOWED_VALUE_BINDING_PREFIX)) {
          errors.push({ severity: "error", code: "GOV_BINDING_BAD_VALUE", message: `value binding "${bindings.value}" must start with "${ALLOWED_VALUE_BINDING_PREFIX}"`, nodeId, path: `nodes.${nodeId}.bindings.value` });
        }
      }
      if (typeof bindings.options === "string") {
        if (!ALLOWED_OPTIONS_BINDING_PREFIXES.some((p) => (bindings.options as string).startsWith(p))) {
          errors.push({ severity: "error", code: "GOV_BINDING_BAD_OPTIONS", message: `options binding "${bindings.options}" not in allowlist`, nodeId, path: `nodes.${nodeId}.bindings.options` });
        }
      }

      for (const [bKey, bVal] of Object.entries(bindings)) {
        if (isExprLike(bVal)) {
          const m = measureExpr(bVal, 1);
          if (m.maxDepth > MAX_EXPR_DEPTH) {
            errors.push({ severity: "error", code: "GOV_EXPR_TOO_DEEP", message: `Expression depth ${m.maxDepth} exceeds max ${MAX_EXPR_DEPTH}`, nodeId, path: `nodes.${nodeId}.bindings.${bKey}` });
          }
          if (m.nodeCount > MAX_EXPR_NODE_COUNT) {
            errors.push({ severity: "error", code: "GOV_EXPR_TOO_LARGE", message: `Expression has ${m.nodeCount} nodes (max ${MAX_EXPR_NODE_COUNT})`, nodeId, path: `nodes.${nodeId}.bindings.${bKey}` });
          }
          validateExprOps(bVal, errors, `nodes.${nodeId}.bindings.${bKey}`);
        }
      }
    }

    if (n.events) {
      for (const [evtName, actions] of Object.entries(n.events)) {
        if (!ALLOWED_EVENT_NAMES.has(evtName)) {
          errors.push({ severity: "error", code: "GOV_EVENT_UNKNOWN", message: `Unknown event "${evtName}"`, nodeId, path: `nodes.${nodeId}.events.${evtName}` });
        }
        if (Array.isArray(actions)) {
          validateActions(actions as ActionLike[], errors, `nodes.${nodeId}.events.${evtName}`, nodeId);
        }
      }
    }
  }

  if (d.pageEvents?.onLoad && Array.isArray(d.pageEvents.onLoad)) {
    validateActions(d.pageEvents.onLoad as ActionLike[], errors, "pageEvents.onLoad");
  }

  return { errors, warnings, ok: errors.length === 0 };
}
