using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Message
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("channel_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ChannelId { get; set; } = null!;

    [BsonElement("sender_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SenderId { get; set; } = null!;

    [BsonElement("sender_name")]
    public string SenderName { get; set; } = null!;

    [BsonElement("content")]
    public string Content { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
