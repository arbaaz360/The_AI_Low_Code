using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MetadataApi.Models;

public class AppVersion
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = "default";

    [BsonElement("appKey")]
    public string AppKey { get; set; } = "";

    [BsonElement("versionId")]
    public string VersionId { get; set; } = "";

    [BsonElement("schemaVersion")]
    public string SchemaVersion { get; set; } = "";

    [BsonElement("contentHash")]
    public string ContentHash { get; set; } = "";

    [BsonElement("doc")]
    public BsonDocument Doc { get; set; } = new();

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("createdBy")]
    public string? CreatedBy { get; set; }
}
