export interface GovIssue {
    severity: "error" | "warning";
    code: string;
    message: string;
    nodeId?: string;
    path?: string;
}
export interface GovernanceResult {
    errors: GovIssue[];
    warnings: GovIssue[];
    ok: boolean;
}
//# sourceMappingURL=types.d.ts.map