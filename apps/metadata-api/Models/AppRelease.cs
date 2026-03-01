using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MetadataApi.Models;

public class AppRelease
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = "default";

    [BsonElement("appKey")]
    public string AppKey { get; set; } = "";

    [BsonElement("channel")]
    public string Channel { get; set; } = "";

    [BsonElement("versionId")]
    public string VersionId { get; set; } = "";

    [BsonElement("schemaVersion")]
    public string SchemaVersion { get; set; } = "";

    [BsonElement("contentHash")]
    public string ContentHash { get; set; } = "";

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [BsonElement("updatedBy")]
    public string? UpdatedBy { get; set; }
}
