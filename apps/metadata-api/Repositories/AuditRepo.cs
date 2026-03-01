using MetadataApi.Models;
using MongoDB.Driver;

namespace MetadataApi.Repositories;

public class AuditRepo : IAuditRepo
{
    private readonly IMongoCollection<AuditEvent> _col;

    public AuditRepo(IMongoDatabase db)
    {
        _col = db.GetCollection<AuditEvent>("audit_events");
    }

    public async Task EnsureIndexes()
    {
        var indexModel = new CreateIndexModel<AuditEvent>(
            Builders<AuditEvent>.IndexKeys
                .Ascending(x => x.TenantId)
                .Ascending(x => x.AppKey)
                .Descending(x => x.At),
            new CreateIndexOptions { Name = "tenant_appKey_at_desc" });
        await _col.Indexes.CreateOneAsync(indexModel);
    }

    public async Task LogAsync(AuditEvent evt) =>
        await _col.InsertOneAsync(evt);
}
