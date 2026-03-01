import type { PublishVersionResponse, PromoteReleaseResponse, ReleaseResponse, VersionListItem, PublishClientOptions, CachedResponse, ValidationError, ConflictError } from "./types.js";
export declare class PublishClientError extends Error {
    status: number;
    validation?: ValidationError | undefined;
    conflict?: ConflictError | undefined;
    constructor(message: string, status: number, validation?: ValidationError | undefined, conflict?: ConflictError | undefined);
}
export declare function createPublishClient(options: PublishClientOptions): {
    readonly tenantId: string;
    publishVersion(appKey: string, doc: unknown, notes?: string): Promise<PublishVersionResponse>;
    promoteRelease(appKey: string, channel: string, versionId: string): Promise<PromoteReleaseResponse>;
    getRelease(appKey: string, channel: string): Promise<CachedResponse<ReleaseResponse>>;
    getVersion(appKey: string, versionId: string): Promise<CachedResponse<unknown>>;
    listVersions(appKey: string, limit?: number): Promise<VersionListItem[]>;
    clearCache(): void;
};
export type PublishClient = ReturnType<typeof createPublishClient>;
//# sourceMappingURL=client.d.ts.map