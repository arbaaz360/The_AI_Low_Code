import type { Diagnostic } from "./types.js";
/**
 * Clamps a span value to valid range 1..12.
 */
export declare function clampSpan(value: number): number;
/**
 * Validates layout.span for gridItem nodes. Returns diagnostics for invalid values.
 * Does not mutate. Use for surfacing warnings on existing doc.
 */
export declare function validateLayoutSpan(nodeId: string, layout: Record<string, unknown> | undefined): Diagnostic[];
//# sourceMappingURL=layoutValidation.d.ts.map