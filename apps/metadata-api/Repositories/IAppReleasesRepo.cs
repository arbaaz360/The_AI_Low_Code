using MetadataApi.Models;

namespace MetadataApi.Repositories;

public interface IAppReleasesRepo
{
    Task<AppRelease?> Find(string tenantId, string appKey, string channel);
    Task UpsertAsync(AppRelease release);
    Task<bool> ConditionalUpsertAsync(AppRelease release, string expectedVersionId);
}
