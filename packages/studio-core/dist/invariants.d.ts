import type { FormDoc } from "@ai-low-code/engine";
import type { Diagnostic } from "./types.js";
/**
 * Validates doc invariants: root exists, children exist, no cycles, keys match ids.
 * Returns diagnostics for any violations.
 */
export declare function validateInvariants(doc: FormDoc): Diagnostic[];
//# sourceMappingURL=invariants.d.ts.map