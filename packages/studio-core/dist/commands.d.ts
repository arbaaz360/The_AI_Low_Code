import type { FormDoc } from "@ai-low-code/engine";
import type { Command, ApplyResult } from "./types.js";
/**
 * Applies a command to the doc. Returns new doc and any diagnostics.
 * Does not mutate the input doc.
 */
export declare function applyCommand(doc: FormDoc, command: Command): ApplyResult;
//# sourceMappingURL=commands.d.ts.map