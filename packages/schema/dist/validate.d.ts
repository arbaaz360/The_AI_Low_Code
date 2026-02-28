export interface ValidationResult {
    ok: boolean;
    errors: {
        path: string;
        message: string;
    }[];
}
/**
 * Validates a FormDoc against the schema. Returns stable, readable errors.
 */
export declare function validateFormDoc(doc: unknown): ValidationResult;
//# sourceMappingURL=validate.d.ts.map