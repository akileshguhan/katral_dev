using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class ConfigService
{
    private const string VideoEngineKey = "video_engine";
    private readonly MongoDbContext _db;

    public ConfigService(MongoDbContext db) => _db = db;

    public async Task EnsureDefaultAsync()
    {
        // Atomic upsert: only sets Value on insert, never overwrites an existing value
        var update = Builders<Config>.Update.SetOnInsert(c => c.Value, "livekit");
        await _db.Configs.UpdateOneAsync(
            c => c.Key == VideoEngineKey,
            update,
            new UpdateOptions { IsUpsert = true });
    }

    public async Task<string> GetVideoEngineAsync()
    {
        var doc = await _db.Configs.Find(c => c.Key == VideoEngineKey).FirstOrDefaultAsync();
        return doc?.Value ?? "livekit";
    }

    public async Task SetVideoEngineAsync(string engine)
    {
        var update = Builders<Config>.Update.Set(c => c.Value, engine);
        await _db.Configs.UpdateOneAsync(
            c => c.Key == VideoEngineKey,
            update,
            new UpdateOptions { IsUpsert = true });
    }
}
