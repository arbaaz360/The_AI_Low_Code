using MetadataApi.Repositories;
using MetadataApi.Services;
using MetadataApi.Validation;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var mongoCs = builder.Configuration["Mongo:ConnectionString"] ?? "mongodb://localhost:27017";
var mongoDb = builder.Configuration["Mongo:Database"] ?? "ai_lowcode";

builder.Services.AddSingleton<IMongoClient>(new MongoClient(mongoCs));
builder.Services.AddSingleton(sp => sp.GetRequiredService<IMongoClient>().GetDatabase(mongoDb));

builder.Services.AddSingleton<IAppVersionsRepo, AppVersionsRepo>();
builder.Services.AddSingleton<IAppReleasesRepo, AppReleasesRepo>();
builder.Services.AddSingleton<IAuditRepo, AuditRepo>();

builder.Services.AddSingleton(sp =>
{
    var validator = SchemaValidator.CreateAsync().GetAwaiter().GetResult();
    return validator;
});
builder.Services.AddScoped<PublishService>();

builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    await new AppVersionsRepo(db).EnsureIndexes();
    await new AppReleasesRepo(db).EnsureIndexes();
    await new AuditRepo(db).EnsureIndexes();
}

app.Run();
