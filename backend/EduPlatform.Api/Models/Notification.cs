using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Notification
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("user_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = null!;

    [BsonElement("title")]
    public string Title { get; set; } = null!;

    [BsonElement("body")]
    public string Body { get; set; } = null!;

    [BsonElement("session_id")]
    public string? SessionId { get; set; }

    [BsonElement("classroom_id")]
    public string? ClassroomId { get; set; }

    [BsonElement("read")]
    public bool Read { get; set; } = false;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
