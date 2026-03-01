using MetadataApi.Models;
using MongoDB.Driver;

namespace MetadataApi.Repositories;

public class AppVersionsRepo : IAppVersionsRepo
{
    private readonly IMongoCollection<AppVersion> _col;

    public AppVersionsRepo(IMongoDatabase db)
    {
        _col = db.GetCollection<AppVersion>("app_versions");
    }

    public async Task EnsureIndexes()
    {
        var indexModels = new[]
        {
            new CreateIndexModel<AppVersion>(
                Builders<AppVersion>.IndexKeys
                    .Ascending(x => x.TenantId)
                    .Ascending(x => x.AppKey)
                    .Ascending(x => x.VersionId),
                new CreateIndexOptions { Unique = true, Name = "tenant_appKey_versionId_unique" }),
            new CreateIndexModel<AppVersion>(
                Builders<AppVersion>.IndexKeys
                    .Ascending(x => x.TenantId)
                    .Ascending(x => x.AppKey)
                    .Descending(x => x.CreatedAt),
                new CreateIndexOptions { Name = "tenant_appKey_createdAt_desc" }),
            new CreateIndexModel<AppVersion>(
                Builders<AppVersion>.IndexKeys
                    .Ascending(x => x.TenantId)
                    .Ascending(x => x.AppKey)
                    .Ascending(x => x.ContentHash),
                new CreateIndexOptions { Unique = true, Name = "tenant_appKey_contentHash_unique" }),
        };
        await _col.Indexes.CreateManyAsync(indexModels);
    }

    public async Task<AppVersion?> Find(string tenantId, string appKey, string versionId) =>
        await _col.Find(x => x.TenantId == tenantId && x.AppKey == appKey && x.VersionId == versionId).FirstOrDefaultAsync();

    public async Task<AppVersion?> FindByHash(string tenantId, string appKey, string contentHash) =>
        await _col.Find(x => x.TenantId == tenantId && x.AppKey == appKey && x.ContentHash == contentHash).FirstOrDefaultAsync();

    public async Task InsertAsync(AppVersion version) =>
        await _col.InsertOneAsync(version);

    public async Task<List<AppVersion>> List(string tenantId, string appKey, int limit = 50) =>
        await _col.Find(x => x.TenantId == tenantId && x.AppKey == appKey)
            .SortByDescending(x => x.CreatedAt)
            .Limit(limit)
            .ToListAsync();
}
