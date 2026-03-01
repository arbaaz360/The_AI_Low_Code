using System.Text.Json;

namespace MetadataApi.Models;

public record PublishVersionRequest(JsonElement Doc, string? Notes);

public record PublishVersionResponse(
    string VersionId,
    string SchemaVersion,
    string ContentHash,
    DateTime CreatedAt
);

public record PromoteReleaseRequest(string VersionId);

public record PromoteReleaseResponse(
    string AppKey,
    string Channel,
    string VersionId,
    DateTime UpdatedAt
);

public record ReleaseResponse(
    string VersionId,
    string SchemaVersion,
    string ContentHash,
    DateTime UpdatedAt
);

public record VersionListItem(
    string VersionId,
    DateTime CreatedAt,
    string? Notes,
    string ContentHash,
    string SchemaVersion
);

public record ValidationErrorResponse(string Error, string[] Details);
