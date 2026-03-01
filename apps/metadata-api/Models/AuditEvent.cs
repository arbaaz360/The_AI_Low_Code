using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MetadataApi.Models;

public class AuditEvent
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonElement("tenantId")]
    public string TenantId { get; set; } = "default";

    [BsonElement("appKey")]
    public string AppKey { get; set; } = "";

    [BsonElement("type")]
    public string Type { get; set; } = "";

    [BsonElement("at")]
    public DateTime At { get; set; }

    [BsonElement("actor")]
    public string? Actor { get; set; }

    [BsonElement("meta")]
    public BsonDocument? Meta { get; set; }
}
