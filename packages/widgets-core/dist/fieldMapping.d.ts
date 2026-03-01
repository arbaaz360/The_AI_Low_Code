/** Minimal field shape from domain model (design-time) */
export interface DomainFieldLike {
    type: string;
    name: string;
    displayName?: string;
    required?: boolean;
    maxLength?: number;
    options?: string[];
}
/** Map domain field type to widget type for auto-create */
export declare function mapFieldToWidget(field: DomainFieldLike): string;
//# sourceMappingURL=fieldMapping.d.ts.map