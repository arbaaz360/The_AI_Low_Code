import type { Expr } from "@ai-low-code/expr";

// ---------------------------------------------------------------------------
// EventRef — resolves to the event payload at runtime
// ---------------------------------------------------------------------------

export interface EventRef {
  $event: "value" | "checked";
}

export function isEventRef(v: unknown): v is EventRef {
  return v != null && typeof v === "object" && "$event" in (v as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Action discriminated union (governance-first: no arbitrary JS)
// ---------------------------------------------------------------------------

export interface SetValueAction {
  type: "SetValue";
  path: string;
  value: EventRef | Expr | unknown;
}

export interface ValidateFormAction {
  type: "ValidateForm";
}

export interface ToastAction {
  type: "Toast";
  message: string | Expr;
  severity?: "success" | "info" | "warning" | "error";
}

export interface NavigateAction {
  type: "Navigate";
  to: string | Expr;
}

export interface BatchAction {
  type: "Batch";
  actions: Action[];
}

export interface IfAction {
  type: "If";
  condition: Expr;
  then: Action[];
  else?: Action[];
}

export interface CallDataSourceAction {
  type: "CallDataSource";
  dataSourceId: string;
  args?: Expr;
  resultKey: string;
  requestKey?: string;
  onError?: Action[];
}

export interface SetDataAction {
  type: "SetData";
  key: string;
  value: Expr;
}

export type Action =
  | SetValueAction
  | ValidateFormAction
  | ToastAction
  | NavigateAction
  | BatchAction
  | IfAction
  | CallDataSourceAction
  | SetDataAction;

export const ACTION_TYPES = [
  "SetValue",
  "ValidateForm",
  "Toast",
  "Navigate",
  "Batch",
  "If",
  "CallDataSource",
  "SetData",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

// ---------------------------------------------------------------------------
// Node events shape
// ---------------------------------------------------------------------------

export interface NodeEvents {
  onChange?: Action[];
  onClick?: Action[];
  onBlur?: Action[];
}

export type NodeEventName = keyof NodeEvents;

// ---------------------------------------------------------------------------
// Action context passed to the runner per invocation
// ---------------------------------------------------------------------------

export interface ActionContext {
  nodeId: string;
  nodeType: string;
  eventPayload: { value?: unknown; checked?: boolean };
  mode: "runtime" | "design";
}

// ---------------------------------------------------------------------------
// Telemetry hook (lightweight observability)
// ---------------------------------------------------------------------------

export interface TelemetryHook {
  onActionStart?: (action: Action, ctx: ActionContext) => void;
  onActionEnd?: (action: Action, ctx: ActionContext) => void;
  onActionError?: (action: Action, ctx: ActionContext, error: unknown) => void;
}

// ---------------------------------------------------------------------------
// Structured action error
// ---------------------------------------------------------------------------

export interface ActionError {
  actionType: string;
  message: string;
  nodeId: string;
  details?: unknown;
}

// ---------------------------------------------------------------------------
// Dependencies injected into the runner
// ---------------------------------------------------------------------------

export interface DataSourceClientLike {
  execute(opts: { dataSourceId: string; args?: Record<string, unknown>; signal?: AbortSignal }): Promise<unknown>;
}

export interface ActionRunnerDeps {
  dispatch: (reduxAction: { type: string; payload: unknown }) => void;
  getState: () => { engine: { values: Record<string, unknown>; data: { byKey: Record<string, unknown> } } };
  setValueActionCreator: (payload: { path: string; value: unknown }) => { type: string; payload: unknown };
  dataRequestStartedCreator?: (payload: { requestId: string; dataSourceId: string }) => { type: string; payload: unknown };
  dataRequestSucceededCreator?: (payload: { requestId: string; resultKey: string; result: unknown }) => { type: string; payload: unknown };
  dataRequestFailedCreator?: (payload: { requestId: string; error: string }) => { type: string; payload: unknown };
  dataSetByKeyCreator?: (payload: { key: string; value: unknown }) => { type: string; payload: unknown };
  dataSourceClient?: DataSourceClientLike;
  validateAll?: () => void;
  evalExpr: (ast: Expr, ctx: { get: (path: string) => unknown }) => unknown;
  navigate?: (to: string) => void;
  toast?: (opts: { message: string; severity?: string }) => void;
  telemetry?: TelemetryHook;
}
