import type { Expr } from "@ai-low-code/expr";
import type {
  Action,
  ActionContext,
  ActionError,
  ActionRunnerDeps,
  EventRef,
} from "./types.js";
import { isEventRef } from "./types.js";

const ALLOWED_PATH_PREFIXES = ["form.values.", "ui."];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((p) => path.startsWith(p));
}

const SIDE_EFFECT_TYPES = new Set(["Toast", "Navigate", "ValidateForm", "CallDataSource"]);

export interface ActionRunner {
  run(actions: Action[] | undefined, ctx: ActionContext): Promise<ActionError[]>;
}

export function createActionRunner(deps: ActionRunnerDeps): ActionRunner {
  const {
    dispatch, getState, setValueActionCreator, validateAll, evalExpr,
    navigate, toast, telemetry,
    dataSourceClient,
    dataRequestStartedCreator,
    dataRequestSucceededCreator,
    dataRequestFailedCreator,
    dataSetByKeyCreator,
  } = deps;

  let requestCounter = 0;

  function makeEvalCtx(): { get: (path: string) => unknown } {
    const state = getState();
    return {
      get(path: string): unknown {
        if (path.startsWith("form.")) {
          return getByDotPath(state.engine.values, path);
        }
        if (path.startsWith("data.byKey.")) {
          const key = path.slice("data.byKey.".length);
          return state.engine.data?.byKey?.[key];
        }
        return undefined;
      },
    };
  }

  function resolveValue(value: EventRef | Expr | unknown, ctx: ActionContext): unknown {
    if (isEventRef(value)) {
      if (value.$event === "value") return ctx.eventPayload.value;
      if (value.$event === "checked") return ctx.eventPayload.checked;
      return undefined;
    }
    if (value != null && typeof value === "object" && "op" in (value as Record<string, unknown>)) {
      return evalExpr(value as Expr, makeEvalCtx());
    }
    return value;
  }

  function resolveStringOrExpr(val: string | Expr): string {
    if (typeof val === "string") return val;
    const result = evalExpr(val, makeEvalCtx());
    return result != null ? String(result) : "";
  }

  async function runOne(action: Action, ctx: ActionContext): Promise<ActionError | null> {
    if (ctx.mode === "design" && SIDE_EFFECT_TYPES.has(action.type)) {
      return null;
    }

    telemetry?.onActionStart?.(action, ctx);

    try {
      switch (action.type) {
        case "SetValue": {
          if (!isAllowedPath(action.path)) {
            const err: ActionError = {
              actionType: "SetValue",
              message: `Path "${action.path}" is not in the allowlist (${ALLOWED_PATH_PREFIXES.join(", ")})`,
              nodeId: ctx.nodeId,
            };
            telemetry?.onActionError?.(action, ctx, err);
            return err;
          }
          const val = resolveValue(action.value, ctx);
          dispatch(setValueActionCreator({ path: action.path, value: val }));
          break;
        }

        case "ValidateForm": {
          validateAll?.();
          break;
        }

        case "Toast": {
          const message = resolveStringOrExpr(action.message);
          toast?.({ message, severity: action.severity });
          break;
        }

        case "Navigate": {
          const to = resolveStringOrExpr(action.to);
          navigate?.(to);
          break;
        }

        case "Batch": {
          const errors = await runMany(action.actions, ctx);
          if (errors.length > 0) return errors[0]!;
          break;
        }

        case "If": {
          const condResult = evalExpr(action.condition, makeEvalCtx());
          const truthy = condResult !== undefined && condResult !== null && condResult !== false && condResult !== 0;
          const branch = truthy ? action.then : action.else ?? [];
          const errors = await runMany(branch, ctx);
          if (errors.length > 0) return errors[0]!;
          break;
        }

        case "CallDataSource": {
          if (!dataSourceClient) {
            const err: ActionError = {
              actionType: "CallDataSource",
              message: "No dataSourceClient configured",
              nodeId: ctx.nodeId,
            };
            telemetry?.onActionError?.(action, ctx, err);
            return err;
          }
          const requestId = action.requestKey ?? `ds_req_${++requestCounter}`;
          if (dataRequestStartedCreator) {
            dispatch(dataRequestStartedCreator({ requestId, dataSourceId: action.dataSourceId }));
          }
          try {
            const args = action.args ? (evalExpr(action.args, makeEvalCtx()) as Record<string, unknown>) : undefined;
            const result = await dataSourceClient.execute({ dataSourceId: action.dataSourceId, args });
            if (dataRequestSucceededCreator) {
              dispatch(dataRequestSucceededCreator({ requestId, resultKey: action.resultKey, result }));
            }
          } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            if (dataRequestFailedCreator) {
              dispatch(dataRequestFailedCreator({ requestId, error: errorMsg }));
            }
            if (action.onError && action.onError.length > 0) {
              await runMany(action.onError, ctx);
            }
            const err: ActionError = {
              actionType: "CallDataSource",
              message: errorMsg,
              nodeId: ctx.nodeId,
              details: e,
            };
            telemetry?.onActionError?.(action, ctx, err);
            return err;
          }
          break;
        }

        case "SetData": {
          if (!dataSetByKeyCreator) {
            const err: ActionError = {
              actionType: "SetData",
              message: "No dataSetByKeyCreator configured",
              nodeId: ctx.nodeId,
            };
            telemetry?.onActionError?.(action, ctx, err);
            return err;
          }
          const val = evalExpr(action.value, makeEvalCtx());
          dispatch(dataSetByKeyCreator({ key: action.key, value: val }));
          break;
        }

        default: {
          const err: ActionError = {
            actionType: (action as { type: string }).type,
            message: `Unknown action type: ${(action as { type: string }).type}`,
            nodeId: ctx.nodeId,
          };
          telemetry?.onActionError?.(action, ctx, err);
          return err;
        }
      }

      telemetry?.onActionEnd?.(action, ctx);
      return null;
    } catch (e) {
      const err: ActionError = {
        actionType: action.type,
        message: e instanceof Error ? e.message : String(e),
        nodeId: ctx.nodeId,
        details: e,
      };
      telemetry?.onActionError?.(action, ctx, err);
      return err;
    }
  }

  async function runMany(actions: Action[], ctx: ActionContext): Promise<ActionError[]> {
    const errors: ActionError[] = [];
    for (const action of actions) {
      const err = await runOne(action, ctx);
      if (err) errors.push(err);
    }
    return errors;
  }

  return {
    async run(actions: Action[] | undefined, ctx: ActionContext): Promise<ActionError[]> {
      if (!actions || actions.length === 0) return [];
      return runMany(actions, ctx);
    },
  };
}

function getByDotPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}
