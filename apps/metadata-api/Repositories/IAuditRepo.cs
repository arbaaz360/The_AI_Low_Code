using MetadataApi.Models;

namespace MetadataApi.Repositories;

public interface IAuditRepo
{
    Task LogAsync(AuditEvent evt);
}
