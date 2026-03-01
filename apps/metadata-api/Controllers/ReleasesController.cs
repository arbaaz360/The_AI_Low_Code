using System.Text.Json;
using MetadataApi.Models;
using MetadataApi.Repositories;
using MetadataApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace MetadataApi.Controllers;

[ApiController]
public class ReleasesController : ControllerBase
{
    private readonly PublishService _publish;
    private readonly IAppReleasesRepo _releases;
    private readonly IAuditRepo _audit;

    public ReleasesController(PublishService publish, IAppReleasesRepo releases, IAuditRepo audit)
    {
        _publish = publish;
        _releases = releases;
        _audit = audit;
    }

    private string GetCorrelationId()
    {
        if (Request.Headers.TryGetValue("X-Correlation-Id", out var val) && !string.IsNullOrEmpty(val))
            return val!;
        return Guid.NewGuid().ToString("N");
    }

    private void SetCorrelationHeader(string id) => Response.Headers["X-Correlation-Id"] = id;
    private void SetDeprecated() => Response.Headers["X-Deprecated-Route"] = "true";

    // Tenant-scoped routes
    [HttpPut("v1/tenants/{tenantId}/apps/{appKey}/releases/{channel}")]
    public Task<IActionResult> PromoteReleaseTenant(string tenantId, string appKey, string channel, [FromBody] PromoteReleaseRequest request)
        => PromoteReleaseCore(tenantId, appKey, channel, request);

    [HttpGet("v1/tenants/{tenantId}/apps/{appKey}/releases/{channel}")]
    public Task<IActionResult> GetReleaseTenant(string tenantId, string appKey, string channel)
        => GetReleaseCore(tenantId, appKey, channel);

    // Legacy non-tenant routes (deprecated)
    [HttpPut("v1/apps/{appKey}/releases/{channel}")]
    public Task<IActionResult> PromoteRelease(string appKey, string channel, [FromBody] PromoteReleaseRequest request)
    { SetDeprecated(); return PromoteReleaseCore("default", appKey, channel, request); }

    [HttpGet("v1/apps/{appKey}/releases/{channel}")]
    public Task<IActionResult> GetRelease(string appKey, string channel)
    { SetDeprecated(); return GetReleaseCore("default", appKey, channel); }

    // Core implementations
    private async Task<IActionResult> PromoteReleaseCore(string tenantId, string appKey, string channel, PromoteReleaseRequest request)
    {
        var cid = GetCorrelationId();
        SetCorrelationHeader(cid);

        string? ifMatch = null;
        if (Request.Headers.ContainsKey("If-Match"))
            ifMatch = Request.Headers.IfMatch.ToString();

        var result = await _publish.PromoteReleaseAsync(tenantId, appKey, channel, request.VersionId, ifMatch, cid);

        if (result.StatusCode == 409)
            return Conflict(new { error = result.Error, current = result.Response });
        if (result.Error != null)
            return BadRequest(new { error = result.Error });
        return Ok(result.Response);
    }

    private async Task<IActionResult> GetReleaseCore(string tenantId, string appKey, string channel)
    {
        var cid = GetCorrelationId();
        SetCorrelationHeader(cid);

        var release = await _releases.Find(tenantId, appKey, channel);
        if (release == null)
            return NotFound(new { error = $"No release for channel '{channel}'" });

        var etag = $"W/\"{release.VersionId}\"";
        if (Request.Headers.IfNoneMatch.Contains(etag))
            return StatusCode(304);

        Response.Headers.ETag = etag;

        await _audit.LogAsync(new AuditEvent
        {
            TenantId = tenantId, AppKey = appKey, Type = "fetch_release", At = DateTime.UtcNow,
            Meta = MongoDB.Bson.BsonDocument.Parse(JsonSerializer.Serialize(new { channel, release.VersionId, correlationId = cid }))
        });

        return Ok(new ReleaseResponse(release.VersionId, release.SchemaVersion, release.ContentHash, release.UpdatedAt));
    }
}
