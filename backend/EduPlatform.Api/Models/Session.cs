using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Session
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("classroom_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ClassroomId { get; set; } = null!;

    [BsonElement("title")]
    public string Title { get; set; } = null!;

    [BsonElement("status")]
    public string Status { get; set; } = "waiting";

    [BsonElement("room_id")]
    public string? RoomId { get; set; }

    [BsonElement("scheduled_at")]
    public DateTime? ScheduledAt { get; set; }

    [BsonElement("duration_minutes")]
    public int? DurationMinutes { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
