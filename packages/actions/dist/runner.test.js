import { describe, it, expect, vi } from "vitest";
import { createActionRunner } from "./runner.js";
function makeDeps(overrides) {
    const values = { form: { values: { x: 1 } } };
    return {
        dispatch: vi.fn(),
        getState: () => ({ engine: { values, data: { byKey: {} } } }),
        setValueActionCreator: (p) => ({ type: "engine/setValue", payload: p }),
        dataRequestStartedCreator: (p) => ({ type: "engine/dataRequestStarted", payload: p }),
        dataRequestSucceededCreator: (p) => ({ type: "engine/dataRequestSucceeded", payload: p }),
        dataRequestFailedCreator: (p) => ({ type: "engine/dataRequestFailed", payload: p }),
        dataSetByKeyCreator: (p) => ({ type: "engine/dataSetByKey", payload: p }),
        evalExpr: (ast, ctx) => {
            if (ast.op === "lit")
                return ast.value;
            if (ast.op === "ref")
                return ctx.get(ast.path);
            return undefined;
        },
        navigate: vi.fn(),
        toast: vi.fn(),
        validateAll: vi.fn(),
        telemetry: undefined,
        ...overrides,
    };
}
function makeCtx(overrides) {
    return {
        nodeId: "n1",
        nodeType: "core.TextInput",
        eventPayload: { value: "hello" },
        mode: "runtime",
        ...overrides,
    };
}
describe("ActionRunner", () => {
    it("SetValue dispatches with resolved $event value", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const actions = [
            { type: "SetValue", path: "form.values.name", value: { $event: "value" } },
        ];
        const errors = await runner.run(actions, makeCtx({ eventPayload: { value: "Alice" } }));
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalledWith({
            type: "engine/setValue",
            payload: { path: "form.values.name", value: "Alice" },
        });
    });
    it("SetValue rejects paths outside allowlist", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const actions = [
            { type: "SetValue", path: "system.secret", value: { $event: "value" } },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain("not in the allowlist");
        expect(deps.dispatch).not.toHaveBeenCalled();
    });
    it("SetValue allows ui.* paths", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const actions = [
            { type: "SetValue", path: "ui.dialogOpen", value: { $event: "value" } },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalled();
    });
    it("Batch runs all actions sequentially", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const batch = {
            type: "Batch",
            actions: [
                { type: "SetValue", path: "form.values.a", value: { $event: "value" } },
                { type: "SetValue", path: "form.values.b", value: { $event: "value" } },
            ],
        };
        const errors = await runner.run([batch], makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalledTimes(2);
    });
    it("If takes then-branch when condition is truthy", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const ifAction = {
            type: "If",
            condition: { op: "lit", value: true },
            then: [{ type: "Toast", message: "yes", severity: "success" }],
            else: [{ type: "Toast", message: "no", severity: "error" }],
        };
        const errors = await runner.run([ifAction], makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.toast).toHaveBeenCalledWith({ message: "yes", severity: "success" });
    });
    it("If takes else-branch when condition is falsy", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const ifAction = {
            type: "If",
            condition: { op: "lit", value: false },
            then: [{ type: "Toast", message: "yes" }],
            else: [{ type: "Toast", message: "no", severity: "warning" }],
        };
        const errors = await runner.run([ifAction], makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.toast).toHaveBeenCalledWith({ message: "no", severity: "warning" });
    });
    it("Toast calls deps.toast", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const errors = await runner.run([{ type: "Toast", message: "Hello!", severity: "info" }], makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.toast).toHaveBeenCalledWith({ message: "Hello!", severity: "info" });
    });
    it("Navigate calls deps.navigate", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const errors = await runner.run([{ type: "Navigate", to: "/dashboard" }], makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.navigate).toHaveBeenCalledWith("/dashboard");
    });
    it("ValidateForm calls deps.validateAll", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const errors = await runner.run([{ type: "ValidateForm" }], makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.validateAll).toHaveBeenCalled();
    });
    it("design mode suppresses side effects but allows SetValue", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const actions = [
            { type: "SetValue", path: "form.values.a", value: { $event: "value" } },
            { type: "Toast", message: "hi" },
            { type: "Navigate", to: "/x" },
            { type: "ValidateForm" },
        ];
        const errors = await runner.run(actions, makeCtx({ mode: "design" }));
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalledTimes(1);
        expect(deps.toast).not.toHaveBeenCalled();
        expect(deps.navigate).not.toHaveBeenCalled();
        expect(deps.validateAll).not.toHaveBeenCalled();
    });
    it("telemetry hooks are called", async () => {
        const onActionStart = vi.fn();
        const onActionEnd = vi.fn();
        const deps = makeDeps({ telemetry: { onActionStart, onActionEnd } });
        const runner = createActionRunner(deps);
        await runner.run([{ type: "Toast", message: "x" }], makeCtx());
        expect(onActionStart).toHaveBeenCalledTimes(1);
        expect(onActionEnd).toHaveBeenCalledTimes(1);
    });
    it("returns empty array for undefined/empty actions", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        expect(await runner.run(undefined, makeCtx())).toEqual([]);
        expect(await runner.run([], makeCtx())).toEqual([]);
    });
    it("SetValue resolves Expr-based value", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const actions = [
            { type: "SetValue", path: "form.values.y", value: { op: "lit", value: 42 } },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalledWith({
            type: "engine/setValue",
            payload: { path: "form.values.y", value: 42 },
        });
    });
    // --- CallDataSource ---
    it("CallDataSource: success stores result via dispatch", async () => {
        const mockClient = { execute: vi.fn().mockResolvedValue([{ value: "US", label: "United States" }]) };
        const deps = makeDeps({ dataSourceClient: mockClient });
        const runner = createActionRunner(deps);
        const actions = [
            { type: "CallDataSource", dataSourceId: "ds1", resultKey: "countries", requestKey: "req1" },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "engine/dataRequestStarted", payload: { requestId: "req1", dataSourceId: "ds1" } }));
        expect(deps.dispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: "engine/dataRequestSucceeded",
            payload: { requestId: "req1", resultKey: "countries", result: [{ value: "US", label: "United States" }] },
        }));
    });
    it("CallDataSource: failure dispatches error and runs onError", async () => {
        const mockClient = { execute: vi.fn().mockRejectedValue(new Error("Network fail")) };
        const deps = makeDeps({ dataSourceClient: mockClient });
        const runner = createActionRunner(deps);
        const actions = [
            {
                type: "CallDataSource",
                dataSourceId: "ds1",
                resultKey: "countries",
                requestKey: "req1",
                onError: [{ type: "Toast", message: "Failed to load", severity: "error" }],
            },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe("Network fail");
        expect(deps.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "engine/dataRequestFailed", payload: { requestId: "req1", error: "Network fail" } }));
        expect(deps.toast).toHaveBeenCalledWith({ message: "Failed to load", severity: "error" });
    });
    it("CallDataSource: suppressed in design mode", async () => {
        const mockClient = { execute: vi.fn().mockResolvedValue("ok") };
        const deps = makeDeps({ dataSourceClient: mockClient });
        const runner = createActionRunner(deps);
        const actions = [
            { type: "CallDataSource", dataSourceId: "ds1", resultKey: "r" },
        ];
        const errors = await runner.run(actions, makeCtx({ mode: "design" }));
        expect(errors).toHaveLength(0);
        expect(mockClient.execute).not.toHaveBeenCalled();
    });
    it("CallDataSource: error when no client configured", async () => {
        const deps = makeDeps({ dataSourceClient: undefined });
        const runner = createActionRunner(deps);
        const actions = [
            { type: "CallDataSource", dataSourceId: "ds1", resultKey: "r" },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain("No dataSourceClient");
    });
    // --- SetData ---
    it("SetData dispatches dataSetByKey", async () => {
        const deps = makeDeps();
        const runner = createActionRunner(deps);
        const actions = [
            { type: "SetData", key: "myList", value: { op: "lit", value: [1, 2, 3] } },
        ];
        const errors = await runner.run(actions, makeCtx());
        expect(errors).toHaveLength(0);
        expect(deps.dispatch).toHaveBeenCalledWith({
            type: "engine/dataSetByKey",
            payload: { key: "myList", value: [1, 2, 3] },
        });
    });
});
