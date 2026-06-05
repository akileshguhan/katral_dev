using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class ChannelService
{
    private readonly MongoDbContext _db;

    public ChannelService(MongoDbContext db) => _db = db;

    public static bool IsValidType(string type) =>
        type is "general" or "announcement" or "resource";

    public async Task<List<Channel>> GetByClassroomAsync(string classroomId) =>
        await _db.Channels.Find(c => c.ClassroomId == classroomId).ToListAsync();

    public async Task<Channel> CreateAsync(string classroomId, string name, string type)
    {
        var channel = new Channel { ClassroomId = classroomId, Name = name, Type = type };
        await _db.Channels.InsertOneAsync(channel);
        return channel;
    }

    public async Task<List<Message>> GetMessagesAsync(string channelId) =>
        await _db.Messages
            .Find(m => m.ChannelId == channelId)
            .SortBy(m => m.CreatedAt)
            .Limit(100)
            .ToListAsync();

    public async Task<Message> SendMessageAsync(string channelId, string senderId, string senderName, string content)
    {
        var message = new Message
        {
            ChannelId  = channelId,
            SenderId   = senderId,
            SenderName = senderName,
            Content    = content,
        };
        await _db.Messages.InsertOneAsync(message);
        return message;
    }
}
