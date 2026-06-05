using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Classroom
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("teacher_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TeacherId { get; set; } = null!;

    [BsonElement("join_code")]
    public string JoinCode { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
