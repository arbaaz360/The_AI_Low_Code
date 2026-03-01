import { describe, it, expect } from "vitest";
import { validateGovernance } from "./validate.js";
function minDoc(overrides) {
    return {
        schemaVersion: "1.0",
        pageFamily: "Form",
        rootNodeId: "root",
        nodes: {
            root: { id: "root", type: "layout.Section", props: { title: "Test" }, children: [] },
        },
        rules: [],
        dataContext: { entity: "Test", mode: "create" },
        submission: { submitOperation: { operationId: "op1" }, mapping: [] },
        ...overrides,
    };
}
describe("validateGovernance", () => {
    it("passes for a valid canonical doc", () => {
        const result = validateGovernance(minDoc());
        expect(result.ok).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });
    it("detects unknown widget type", () => {
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "evil.Widget", children: [] },
            },
        });
        const result = validateGovernance(doc);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.code === "GOV_WIDGET_UNKNOWN")).toBe(true);
    });
    it("warns on legacy widget type", () => {
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "FormGrid", children: [] },
            },
        });
        const result = validateGovernance(doc);
        expect(result.ok).toBe(true);
        expect(result.warnings.some((w) => w.code === "GOV_WIDGET_LEGACY")).toBe(true);
    });
    it("warns on unknown prop key", () => {
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "core.TextInput", props: { label: "OK", hackProp: "x" } },
            },
        });
        const result = validateGovernance(doc);
        expect(result.warnings.some((w) => w.code === "GOV_PROP_UNKNOWN" && w.message.includes("hackProp"))).toBe(true);
    });
    it("detects bad value binding path", () => {
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "core.TextInput", bindings: { value: "system.secret" } },
            },
        });
        const result = validateGovernance(doc);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.code === "GOV_BINDING_BAD_VALUE")).toBe(true);
    });
    it("detects bad options binding path", () => {
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "core.Select", bindings: { options: "evil.data" } },
            },
        });
        const result = validateGovernance(doc);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.code === "GOV_BINDING_BAD_OPTIONS")).toBe(true);
    });
    it("allows valid options binding path", () => {
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "core.Select", bindings: { value: "form.values.x", options: "data.byKey.countries" } },
            },
        });
        const result = validateGovernance(doc);
        expect(result.errors.filter((e) => e.code === "GOV_BINDING_BAD_OPTIONS")).toHaveLength(0);
    });
    it("detects unknown action type in events", () => {
        const doc = minDoc({
            nodes: {
                root: {
                    id: "root",
                    type: "core.Button",
                    events: { onClick: [{ type: "ExecuteScript" }] },
                },
            },
        });
        const result = validateGovernance(doc);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.code === "GOV_ACTION_UNKNOWN")).toBe(true);
    });
    it("detects unknown event name", () => {
        const doc = minDoc({
            nodes: {
                root: {
                    id: "root",
                    type: "core.Button",
                    events: { onHover: [{ type: "Toast", message: "hi" }] },
                },
            },
        });
        const result = validateGovernance(doc);
        expect(result.ok).toBe(false);
        expect(result.errors.some((e) => e.code === "GOV_EVENT_UNKNOWN")).toBe(true);
    });
    it("detects SetValue with bad path in actions", () => {
        const doc = minDoc({
            nodes: {
                root: {
                    id: "root",
                    type: "core.Button",
                    events: { onClick: [{ type: "SetValue", path: "system.hack", value: 1 }] },
                },
            },
        });
        const result = validateGovernance(doc);
        expect(result.errors.some((e) => e.code === "GOV_ACTION_BAD_PATH")).toBe(true);
    });
    it("detects expression too deep", () => {
        let expr = { op: "lit", value: 1 };
        for (let i = 0; i < 25; i++) {
            expr = { op: "not", left: expr };
        }
        const doc = minDoc({
            nodes: {
                root: { id: "root", type: "core.TextInput", bindings: { visible: expr } },
            },
        });
        const result = validateGovernance(doc);
        expect(result.errors.some((e) => e.code === "GOV_EXPR_TOO_DEEP")).toBe(true);
    });
    it("detects oversized doc", () => {
        const nodes = {};
        for (let i = 0; i < 501; i++) {
            nodes[`n${i}`] = { id: `n${i}`, type: "core.TextInput", props: { label: "x".repeat(3000) } };
        }
        const doc = minDoc({ nodes });
        const result = validateGovernance(doc);
        expect(result.errors.some((e) => e.code === "GOV_TOO_MANY_NODES" || e.code === "GOV_DOC_TOO_LARGE")).toBe(true);
    });
    it("validates pageEvents.onLoad actions", () => {
        const doc = minDoc({
            pageEvents: { onLoad: [{ type: "ExecuteScript" }] },
        });
        const result = validateGovernance(doc);
        expect(result.errors.some((e) => e.code === "GOV_ACTION_UNKNOWN")).toBe(true);
    });
    it("validates nested actions in Batch/If/onError/onSuccess", () => {
        const doc = minDoc({
            nodes: {
                root: {
                    id: "root",
                    type: "core.Button",
                    events: {
                        onClick: [
                            {
                                type: "SubmitForm",
                                dataSourceId: "ds1",
                                onSuccess: [{ type: "SetValue", path: "system.x", value: 1 }],
                            },
                        ],
                    },
                },
            },
        });
        const result = validateGovernance(doc);
        expect(result.errors.some((e) => e.code === "GOV_ACTION_BAD_PATH")).toBe(true);
    });
    describe("channel-aware governance (prod)", () => {
        it("rejects mock datasource in prod", () => {
            const doc = minDoc({
                dataSources: [{ id: "ds1", kind: "mock", response: [] }],
            });
            const result = validateGovernance(doc, { channel: "prod" });
            expect(result.ok).toBe(false);
            expect(result.errors.some((e) => e.code === "GOV_DS_MOCK_IN_PROD")).toBe(true);
        });
        it("allows mock datasource in preview", () => {
            const doc = minDoc({
                dataSources: [{ id: "ds1", kind: "mock", response: [] }],
            });
            const result = validateGovernance(doc, { channel: "preview" });
            expect(result.errors.some((e) => e.code === "GOV_DS_MOCK_IN_PROD")).toBe(false);
        });
        it("allows mock datasource with no context", () => {
            const doc = minDoc({
                dataSources: [{ id: "ds1", kind: "mock", response: [] }],
            });
            const result = validateGovernance(doc);
            expect(result.errors.some((e) => e.code === "GOV_DS_MOCK_IN_PROD")).toBe(false);
        });
        it("rejects unsafe REST URL in prod", () => {
            const doc = minDoc({
                dataSources: [{ id: "ds1", kind: "rest", method: "GET", url: "https://evil.com/data" }],
            });
            const result = validateGovernance(doc, { channel: "prod", allowedRestHosts: ["api.example.com"] });
            expect(result.ok).toBe(false);
            expect(result.errors.some((e) => e.code === "GOV_DS_REST_UNSAFE")).toBe(true);
        });
        it("allows relative REST URL in prod", () => {
            const doc = minDoc({
                dataSources: [{ id: "ds1", kind: "rest", method: "GET", url: "/api/data" }],
            });
            const result = validateGovernance(doc, { channel: "prod", allowedRestHosts: [] });
            expect(result.errors.some((e) => e.code === "GOV_DS_REST_UNSAFE")).toBe(false);
        });
        it("allows allowlisted REST host in prod", () => {
            const doc = minDoc({
                dataSources: [{ id: "ds1", kind: "rest", method: "GET", url: "https://api.example.com/data" }],
            });
            const result = validateGovernance(doc, { channel: "prod", allowedRestHosts: ["api.example.com"] });
            expect(result.errors.some((e) => e.code === "GOV_DS_REST_UNSAFE")).toBe(false);
        });
    });
});
