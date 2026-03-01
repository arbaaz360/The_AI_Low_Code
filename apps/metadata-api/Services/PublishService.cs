using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using MetadataApi.Models;
using MetadataApi.Repositories;
using MetadataApi.Validation;
using MongoDB.Bson;

namespace MetadataApi.Services;

public class PublishService
{
    private readonly IAppVersionsRepo _versions;
    private readonly IAppReleasesRepo _releases;
    private readonly IAuditRepo _audit;
    private readonly SchemaValidator _schemaValidator;
    private readonly string[] _allowedRestHosts;

    public PublishService(IAppVersionsRepo versions, IAppReleasesRepo releases, IAuditRepo audit, SchemaValidator schemaValidator, IConfiguration config)
    {
        _versions = versions;
        _releases = releases;
        _audit = audit;
        _schemaValidator = schemaValidator;
        _allowedRestHosts = config.GetSection("Governance:AllowedRestHosts").Get<string[]>() ?? [];
    }

    public async Task<(PublishVersionResponse? Result, ValidationErrorResponse? Error)> PublishVersionAsync(
        string tenantId, string appKey, JsonElement rawDoc, string? notes, string? correlationId = null)
    {
        var migration = MigrationService.Migrate(rawDoc);
        var migratedDoc = migration.Doc;
        var canonicalJson = CanonicalizeJson(migratedDoc);

        var (schemaOk, schemaErrors) = _schemaValidator.Validate(canonicalJson);
        if (!schemaOk)
            return (null, new ValidationErrorResponse("Schema validation failed", schemaErrors));

        var govResult = GovernanceValidator.Validate(migratedDoc);
        if (!govResult.Ok)
        {
            var details = govResult.Errors.Select(e => $"[{e.Code}] {e.Message}{(e.NodeId != null ? $" (node: {e.NodeId})" : "")}").ToArray();
            return (null, new ValidationErrorResponse("Governance validation failed", details));
        }

        var contentHash = ComputeSha256(canonicalJson);

        var existing = await _versions.FindByHash(tenantId, appKey, contentHash);
        if (existing != null)
            return (new PublishVersionResponse(existing.VersionId, existing.SchemaVersion, existing.ContentHash, existing.CreatedAt), null);

        var versionId = System.Ulid.NewUlid().ToString();
        var schemaVersion = migratedDoc.TryGetProperty("schemaVersion", out var sv) ? sv.GetString() ?? MigrationService.CurrentSchemaVersion : MigrationService.CurrentSchemaVersion;

        var version = new AppVersion
        {
            TenantId = tenantId,
            AppKey = appKey,
            VersionId = versionId,
            SchemaVersion = schemaVersion,
            ContentHash = contentHash,
            Doc = BsonDocument.Parse(canonicalJson),
            Notes = notes,
            CreatedAt = DateTime.UtcNow,
        };

        await _versions.InsertAsync(version);

        await _audit.LogAsync(new AuditEvent
        {
            TenantId = tenantId, AppKey = appKey, Type = "publish_version", At = DateTime.UtcNow,
            Meta = BsonDocument.Parse(JsonSerializer.Serialize(new { versionId, contentHash, correlationId }))
        });

        return (new PublishVersionResponse(versionId, schemaVersion, contentHash, version.CreatedAt), null);
    }

    public record PromoteResult(PromoteReleaseResponse? Response, string? Error, int StatusCode);

    public async Task<PromoteResult> PromoteReleaseAsync(
        string tenantId, string appKey, string channel, string versionId,
        string? ifMatch = null, string? correlationId = null)
    {
        if (channel != "preview" && channel != "prod")
            return new PromoteResult(null, "Channel must be 'preview' or 'prod'", 400);

        var version = await _versions.Find(tenantId, appKey, versionId);
        if (version == null)
            return new PromoteResult(null, $"Version '{versionId}' not found for app '{appKey}'", 400);

        if (channel == "prod")
        {
            var prodGov = GovernanceValidator.Validate(
                JsonSerializer.Deserialize<JsonElement>(version.Doc.ToString()),
                new GovernanceContext { Channel = "prod", AllowedRestHosts = _allowedRestHosts });
            if (!prodGov.Ok)
            {
                var details = prodGov.Errors.Select(e => $"[{e.Code}] {e.Message}").ToArray();
                return new PromoteResult(null, $"Governance: {string.Join("; ", details)}", 400);
            }
        }

        var current = await _releases.Find(tenantId, appKey, channel);

        if (current != null && ifMatch != null)
        {
            var currentEtag = $"W/\"{current.VersionId}\"";
            if (ifMatch != currentEtag)
                return new PromoteResult(
                    new PromoteReleaseResponse(appKey, channel, current.VersionId, current.UpdatedAt),
                    "Conflict: release pointer has changed", 409);
        }

        if (current != null && ifMatch == null)
        {
            // If-Match required for updates (not first creation)
            // Be lenient: allow without If-Match for backward compat
        }

        var release = new AppRelease
        {
            TenantId = tenantId,
            AppKey = appKey,
            Channel = channel,
            VersionId = versionId,
            SchemaVersion = version.SchemaVersion,
            ContentHash = version.ContentHash,
            UpdatedAt = DateTime.UtcNow,
        };

        await _releases.UpsertAsync(release);

        await _audit.LogAsync(new AuditEvent
        {
            TenantId = tenantId, AppKey = appKey, Type = "promote_release", At = DateTime.UtcNow,
            Meta = BsonDocument.Parse(JsonSerializer.Serialize(new { channel, versionId, correlationId }))
        });

        return new PromoteResult(new PromoteReleaseResponse(appKey, channel, versionId, release.UpdatedAt), null, 200);
    }

    internal static string CanonicalizeJson(JsonElement el)
    {
        var sorted = SortProperties(el);
        return JsonSerializer.Serialize(sorted, new JsonSerializerOptions { WriteIndented = false });
    }

    private static JsonNode? SortProperties(JsonElement el)
    {
        return el.ValueKind switch
        {
            JsonValueKind.Object => SortObject(el),
            JsonValueKind.Array => new JsonArray(el.EnumerateArray().Select(SortProperties).ToArray()),
            _ => JsonNode.Parse(el.GetRawText())
        };
    }

    private static JsonObject SortObject(JsonElement el)
    {
        var obj = new JsonObject();
        foreach (var prop in el.EnumerateObject().OrderBy(p => p.Name, StringComparer.Ordinal))
            obj[prop.Name] = SortProperties(prop.Value);
        return obj;
    }

    internal static string ComputeSha256(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexStringLower(bytes);
    }
}
