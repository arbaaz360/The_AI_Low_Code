using MetadataApi.Models;
using MongoDB.Driver;

namespace MetadataApi.Repositories;

public class AppReleasesRepo : IAppReleasesRepo
{
    private readonly IMongoCollection<AppRelease> _col;

    public AppReleasesRepo(IMongoDatabase db)
    {
        _col = db.GetCollection<AppRelease>("app_releases");
    }

    public async Task EnsureIndexes()
    {
        var indexModel = new CreateIndexModel<AppRelease>(
            Builders<AppRelease>.IndexKeys
                .Ascending(x => x.TenantId)
                .Ascending(x => x.AppKey)
                .Ascending(x => x.Channel),
            new CreateIndexOptions { Unique = true, Name = "tenant_appKey_channel_unique" });
        await _col.Indexes.CreateOneAsync(indexModel);
    }

    public async Task<AppRelease?> Find(string tenantId, string appKey, string channel) =>
        await _col.Find(x => x.TenantId == tenantId && x.AppKey == appKey && x.Channel == channel).FirstOrDefaultAsync();

    public async Task UpsertAsync(AppRelease release)
    {
        var filter = Builders<AppRelease>.Filter.Eq(x => x.TenantId, release.TenantId)
            & Builders<AppRelease>.Filter.Eq(x => x.AppKey, release.AppKey)
            & Builders<AppRelease>.Filter.Eq(x => x.Channel, release.Channel);

        var update = Builders<AppRelease>.Update
            .Set(x => x.VersionId, release.VersionId)
            .Set(x => x.SchemaVersion, release.SchemaVersion)
            .Set(x => x.ContentHash, release.ContentHash)
            .Set(x => x.UpdatedAt, release.UpdatedAt)
            .Set(x => x.UpdatedBy, release.UpdatedBy);

        await _col.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
    }

    public async Task<bool> ConditionalUpsertAsync(AppRelease release, string expectedVersionId)
    {
        var filter = Builders<AppRelease>.Filter.Eq(x => x.TenantId, release.TenantId)
            & Builders<AppRelease>.Filter.Eq(x => x.AppKey, release.AppKey)
            & Builders<AppRelease>.Filter.Eq(x => x.Channel, release.Channel)
            & Builders<AppRelease>.Filter.Eq(x => x.VersionId, expectedVersionId);

        var update = Builders<AppRelease>.Update
            .Set(x => x.VersionId, release.VersionId)
            .Set(x => x.SchemaVersion, release.SchemaVersion)
            .Set(x => x.ContentHash, release.ContentHash)
            .Set(x => x.UpdatedAt, release.UpdatedAt)
            .Set(x => x.UpdatedBy, release.UpdatedBy);

        var result = await _col.UpdateOneAsync(filter, update);
        return result.MatchedCount > 0;
    }
}
