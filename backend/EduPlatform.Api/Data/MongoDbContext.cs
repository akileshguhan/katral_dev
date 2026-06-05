using Microsoft.Extensions.Options;
using MongoDB.Driver;
using EduPlatform.Api.Models;

namespace EduPlatform.Api.Data;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = null!;
    public string DatabaseName { get; set; } = null!;
}

public class MongoDbContext
{
    private readonly IMongoDatabase _db;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _db = client.GetDatabase(settings.Value.DatabaseName);
        EnsureIndexes();
    }

    public IMongoCollection<User> Users => _db.GetCollection<User>("users");
    public IMongoCollection<Classroom> Classrooms => _db.GetCollection<Classroom>("classrooms");
    public IMongoCollection<Session> Sessions => _db.GetCollection<Session>("sessions");
    public IMongoCollection<Channel> Channels => _db.GetCollection<Channel>("channels");
    public IMongoCollection<Message> Messages => _db.GetCollection<Message>("messages");
    public IMongoCollection<Config> Configs => _db.GetCollection<Config>("config");
    public IMongoCollection<Notification>     Notifications     => _db.GetCollection<Notification>("notifications");
    public IMongoCollection<AttendanceRecord> AttendanceRecords => _db.GetCollection<AttendanceRecord>("attendanceRecords");

    private void EnsureIndexes()
    {
        Users.Indexes.CreateOne(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true }));

        Classrooms.Indexes.CreateOne(new CreateIndexModel<Classroom>(
            Builders<Classroom>.IndexKeys.Ascending(c => c.JoinCode),
            new CreateIndexOptions { Unique = true }));

        Sessions.Indexes.CreateOne(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys
                .Ascending(s => s.ClassroomId)
                .Ascending(s => s.Status)));

        Messages.Indexes.CreateOne(new CreateIndexModel<Message>(
            Builders<Message>.IndexKeys
                .Ascending(m => m.ChannelId)
                .Ascending(m => m.CreatedAt)));

        Configs.Indexes.CreateOne(new CreateIndexModel<Config>(
            Builders<Config>.IndexKeys.Ascending(c => c.Key),
            new CreateIndexOptions { Unique = true }));

        Notifications.Indexes.CreateOne(new CreateIndexModel<Notification>(
            Builders<Notification>.IndexKeys
                .Ascending(n => n.UserId)
                .Ascending(n => n.Read)));

        AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(
            Builders<AttendanceRecord>.IndexKeys
                .Ascending(a => a.SessionId)
                .Ascending(a => a.TakenAt)));
    }
}
