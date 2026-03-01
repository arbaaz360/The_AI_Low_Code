using MetadataApi.Models;

namespace MetadataApi.Repositories;

public interface IAppVersionsRepo
{
    Task<AppVersion?> Find(string tenantId, string appKey, string versionId);
    Task<AppVersion?> FindByHash(string tenantId, string appKey, string contentHash);
    Task InsertAsync(AppVersion version);
    Task<List<AppVersion>> List(string tenantId, string appKey, int limit = 50);
}
