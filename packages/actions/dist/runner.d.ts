import type { Action, ActionContext, ActionError, ActionRunnerDeps } from "./types.js";
export interface ActionRunner {
    run(actions: Action[] | undefined, ctx: ActionContext): Promise<ActionError[]>;
}
export declare function createActionRunner(deps: ActionRunnerDeps): ActionRunner;
//# sourceMappingURL=runner.d.ts.map