using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class ClassroomService
{
    private readonly MongoDbContext _db;

    public ClassroomService(MongoDbContext db) => _db = db;

    public static string GenerateJoinCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }

    public async Task<(Classroom classroom, List<Channel> channels)> CreateAsync(string name, string teacherId)
    {
        string code;
        do { code = GenerateJoinCode(); }
        while (await _db.Classrooms.Find(c => c.JoinCode == code).AnyAsync());

        var classroom = new Classroom { Name = name, TeacherId = teacherId, JoinCode = code };
        await _db.Classrooms.InsertOneAsync(classroom);

        var channels = new List<Channel>
        {
            new() { ClassroomId = classroom.Id, Name = "general",       Type = "general" },
            new() { ClassroomId = classroom.Id, Name = "announcements", Type = "announcement" },
            new() { ClassroomId = classroom.Id, Name = "resources",     Type = "resource" },
        };
        await _db.Channels.InsertManyAsync(channels);

        return (classroom, channels);
    }

    public async Task<List<Classroom>> GetByTeacherAsync(string teacherId) =>
        await _db.Classrooms.Find(c => c.TeacherId == teacherId).ToListAsync();

    public async Task<List<Classroom>> GetByStudentAsync(List<string> classroomIds) =>
        await _db.Classrooms.Find(c => classroomIds.Contains(c.Id)).ToListAsync();

    public async Task<Classroom?> GetByIdAsync(string id) =>
        await _db.Classrooms.Find(c => c.Id == id).FirstOrDefaultAsync();

    public async Task<Classroom?> JoinByCodeAsync(string code, string studentId)
    {
        var classroom = await _db.Classrooms.Find(c => c.JoinCode == code.ToUpper()).FirstOrDefaultAsync();
        if (classroom == null) return null;
        if (classroom.TeacherId == studentId) return null;

        var update = Builders<Models.User>.Update.AddToSet(u => u.EnrolledClassrooms, classroom.Id);
        await _db.Users.UpdateOneAsync(u => u.Id == studentId, update);
        return classroom;
    }

    public async Task<bool> LeaveAsync(string classroomId, string studentId)
    {
        var update = Builders<Models.User>.Update.Pull(u => u.EnrolledClassrooms, classroomId);
        var result = await _db.Users.UpdateOneAsync(u => u.Id == studentId, update);
        return result.ModifiedCount > 0;
    }

    public async Task DeleteAsync(string classroomId)
    {
        // Unenroll all students
        var pullUpdate = Builders<Models.User>.Update.Pull(u => u.EnrolledClassrooms, classroomId);
        await _db.Users.UpdateManyAsync(u => u.EnrolledClassrooms.Contains(classroomId), pullUpdate);

        // Cascade delete messages in classroom channels
        var channelIds = await _db.Channels
            .Find(c => c.ClassroomId == classroomId)
            .Project(c => c.Id)
            .ToListAsync();
        if (channelIds.Count > 0)
            await _db.Messages.DeleteManyAsync(m => channelIds.Contains(m.ChannelId));

        // Delete channels, sessions, and the classroom
        await _db.Channels.DeleteManyAsync(c => c.ClassroomId == classroomId);
        await _db.Sessions.DeleteManyAsync(s => s.ClassroomId == classroomId);
        await _db.Classrooms.DeleteOneAsync(c => c.Id == classroomId);
    }
}
