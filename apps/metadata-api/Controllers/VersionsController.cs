using System.Text.Json;
using MetadataApi.Models;
using MetadataApi.Repositories;
using MetadataApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace MetadataApi.Controllers;

[ApiController]
public class VersionsController : ControllerBase
{
    private readonly PublishService _publish;
    private readonly IAppVersionsRepo _versions;
    private readonly IAuditRepo _audit;

    public VersionsController(PublishService publish, IAppVersionsRepo versions, IAuditRepo audit)
    {
        _publish = publish;
        _versions = versions;
        _audit = audit;
    }

    private string GetCorrelationId()
    {
        if (Request.Headers.TryGetValue("X-Correlation-Id", out var val) && !string.IsNullOrEmpty(val))
            return val!;
        var id = Guid.NewGuid().ToString("N");
        return id;
    }

    private void SetCorrelationHeader(string id) => Response.Headers["X-Correlation-Id"] = id;
    private void SetDeprecated() => Response.Headers["X-Deprecated-Route"] = "true";

    // Tenant-scoped routes
    [HttpPost("v1/tenants/{tenantId}/apps/{appKey}/versions")]
    public Task<IActionResult> CreateVersionTenant(string tenantId, string appKey, [FromBody] PublishVersionRequest request)
        => CreateVersionCore(tenantId, appKey, request);

    [HttpGet("v1/tenants/{tenantId}/apps/{appKey}/versions/{versionId}")]
    public Task<IActionResult> GetVersionTenant(string tenantId, string appKey, string versionId)
        => GetVersionCore(tenantId, appKey, versionId);

    [HttpGet("v1/tenants/{tenantId}/apps/{appKey}/versions")]
    public Task<IActionResult> ListVersionsTenant(string tenantId, string appKey, [FromQuery] int limit = 50)
        => ListVersionsCore(tenantId, appKey, limit);

    // Legacy non-tenant routes (deprecated, mapped to "default")
    [HttpPost("v1/apps/{appKey}/versions")]
    public Task<IActionResult> CreateVersion(string appKey, [FromBody] PublishVersionRequest request)
    { SetDeprecated(); return CreateVersionCore("default", appKey, request); }

    [HttpGet("v1/apps/{appKey}/versions/{versionId}")]
    public Task<IActionResult> GetVersion(string appKey, string versionId)
    { SetDeprecated(); return GetVersionCore("default", appKey, versionId); }

    [HttpGet("v1/apps/{appKey}/versions")]
    public Task<IActionResult> ListVersions(string appKey, [FromQuery] int limit = 50)
    { SetDeprecated(); return ListVersionsCore("default", appKey, limit); }

    // Core implementations
    private async Task<IActionResult> CreateVersionCore(string tenantId, string appKey, PublishVersionRequest request)
    {
        var cid = GetCorrelationId();
        SetCorrelationHeader(cid);

        var (result, error) = await _publish.PublishVersionAsync(tenantId, appKey, request.Doc, request.Notes, cid);
        if (error != null)
            return BadRequest(error);
        return Ok(result);
    }

    private async Task<IActionResult> GetVersionCore(string tenantId, string appKey, string versionId)
    {
        var cid = GetCorrelationId();
        SetCorrelationHeader(cid);

        var version = await _versions.Find(tenantId, appKey, versionId);
        if (version == null)
            return NotFound(new { error = $"Version '{versionId}' not found" });

        var etag = $"\"{version.ContentHash}\"";
        if (Request.Headers.IfNoneMatch.Contains(etag))
            return StatusCode(304);

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "public, max-age=31536000, immutable";

        await _audit.LogAsync(new AuditEvent
        {
            TenantId = tenantId, AppKey = appKey, Type = "fetch_version", At = DateTime.UtcNow,
            Meta = MongoDB.Bson.BsonDocument.Parse(JsonSerializer.Serialize(new { versionId, correlationId = cid }))
        });

        var json = version.Doc.ToString();
        return Content(json, "application/json");
    }

    private async Task<IActionResult> ListVersionsCore(string tenantId, string appKey, int limit)
    {
        var cid = GetCorrelationId();
        SetCorrelationHeader(cid);

        var versions = await _versions.List(tenantId, appKey, Math.Min(limit, 200));
        var items = versions.Select(v => new VersionListItem(v.VersionId, v.CreatedAt, v.Notes, v.ContentHash, v.SchemaVersion));
        return Ok(items);
    }
}
