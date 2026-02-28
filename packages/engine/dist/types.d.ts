import type { Expr } from "@ai-low-code/expr";
/** FormDoc shape (validated metadata). */
export interface FormDoc {
    schemaVersion: string;
    pageFamily: string;
    rootNodeId: string;
    nodes: Record<string, FormNode>;
    rules?: FormRule[];
    dataContext: {
        entity: string;
        mode: string;
    };
    submission: {
        submitOperation: {
            operationId: string;
        };
        mapping: SubmissionMapping[];
    };
}
export interface FormNode {
    id: string;
    type: string;
    props?: Record<string, unknown>;
    children?: string[];
    layout?: Record<string, unknown>;
    bindings?: {
        value?: string | Expr;
        label?: string | Expr;
        visible?: string | Expr;
        disabled?: string | Expr;
        options?: string | Expr;
        help?: string | Expr;
        computed?: string | Expr;
    };
    validation?: {
        validators?: {
            type: string;
            message?: string;
            params?: Record<string, unknown>;
        }[];
        asyncValidators?: unknown[];
    };
}
export interface FormRule {
    id: string;
    target: string;
    type: "visibility" | "disabled" | "requiredIf" | "computed" | "defaultValue";
    expr?: Expr;
    value?: unknown;
}
export interface SubmissionMapping {
    sourcePath: string;
    targetPath: string;
    policy?: "persisted" | "writeOnly" | "readOnly" | "transient" | "derived";
    includeIf?: Expr;
    transform?: Expr;
}
//# sourceMappingURL=types.d.ts.map