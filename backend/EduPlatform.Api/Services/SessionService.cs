using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class SessionService
{
    private readonly MongoDbContext _db;

    public SessionService(MongoDbContext db) => _db = db;

    public static string BuildRoomId(string sessionId) => $"session-{sessionId}";

    public async Task<List<Session>> GetByClassroomAsync(string classroomId) =>
        await _db.Sessions.Find(s => s.ClassroomId == classroomId)
            .SortByDescending(s => s.CreatedAt).ToListAsync();

    public async Task<Session> CreateAsync(string classroomId, string title, DateTime? scheduledAt = null, int? durationMinutes = null)
    {
        var session = new Session
        {
            ClassroomId     = classroomId,
            Title           = title,
            Status          = "waiting",
            ScheduledAt     = scheduledAt,
            DurationMinutes = durationMinutes,
        };
        await _db.Sessions.InsertOneAsync(session);
        return session;
    }

    public async Task<Session?> StartAsync(string sessionId)
    {
        var session = await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null) return null;

        var roomId = session.RoomId ?? BuildRoomId(sessionId);
        var update = Builders<Session>.Update
            .Set(s => s.Status, "live")
            .Set(s => s.RoomId, roomId);
        await _db.Sessions.UpdateOneAsync(s => s.Id == sessionId, update);
        session.Status = "live";
        session.RoomId = roomId;
        return session;
    }

    public async Task<Session?> GetByIdAsync(string sessionId) =>
        await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();

    public async Task EndAsync(string sessionId)
    {
        var update = Builders<Session>.Update.Set(s => s.Status, "ended");
        await _db.Sessions.UpdateOneAsync(s => s.Id == sessionId, update);
    }
}
