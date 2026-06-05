using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class AttendanceService
{
    private readonly MongoDbContext _db;
    private readonly SessionService _sessions;

    public AttendanceService(MongoDbContext db, SessionService sessions)
    {
        _db       = db;
        _sessions = sessions;
    }

    public async Task<AttendanceRecord> TakeAsync(string sessionId, string teacherUserId)
    {
        var session = await _sessions.GetByIdAsync(sessionId)
            ?? throw new InvalidOperationException("Session not found");

        if (session.Status != "live")
            throw new InvalidOperationException("Attendance can only be taken in a live session");

        // TODO: replace with LiveKit webhook-driven participant tracking
        var students = new List<AttendeeInfo>();

        var record = new AttendanceRecord
        {
            SessionId       = sessionId,
            ClassroomId     = session.ClassroomId,
            SessionTitle    = session.Title ?? "",
            TakenAt         = DateTime.UtcNow,
            TakenByUserId   = teacherUserId,
            PresentStudents = students,
        };

        await _db.AttendanceRecords.InsertOneAsync(record);
        return record;
    }

    public async Task<List<AttendanceRecord>> GetBySessionAsync(string sessionId) =>
        await _db.AttendanceRecords
            .Find(r => r.SessionId == sessionId)
            .SortByDescending(r => r.TakenAt)
            .ToListAsync();

    public async Task<List<AttendanceRecord>> GetByClassroomAsync(string classroomId) =>
        await _db.AttendanceRecords
            .Find(r => r.ClassroomId == classroomId)
            .SortByDescending(r => r.TakenAt)
            .ToListAsync();

    public async Task<List<AttendanceRecord>> GetForStudentAsync(string userId) =>
        await _db.AttendanceRecords
            .Find(r => r.PresentStudents.Any(s => s.UserId == userId))
            .SortByDescending(r => r.TakenAt)
            .ToListAsync();
}
