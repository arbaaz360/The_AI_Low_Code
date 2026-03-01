import type { FormDoc } from "@ai-low-code/engine";
import type { ComponentType, ReactNode } from "react";
import type { FormEngine } from "@ai-low-code/engine";
import type { ActionRunner } from "@ai-low-code/actions";
export type WidgetRegistry = Record<string, ComponentType<WidgetProps>>;
export interface WidgetProps {
    nodeId: string;
    nodeType: string;
    props?: Record<string, unknown>;
    layout?: Record<string, unknown>;
    doc?: import("@ai-low-code/engine").FormDoc;
    value?: unknown;
    onChange?: (value: unknown) => void;
    onClick?: () => void;
    onBlur?: () => void;
    disabled?: boolean;
    loading?: boolean;
    error?: string[];
    label?: string;
    options?: unknown[] | unknown;
    mode?: "runtime" | "design";
    children?: ReactNode;
}
export interface RendererProps {
    doc: FormDoc;
    engine: FormEngine;
    registry: WidgetRegistry;
    mode?: "runtime" | "design";
    actionRunner?: ActionRunner;
}
//# sourceMappingURL=types.d.ts.map