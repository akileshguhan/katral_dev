using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("role")]
    public string Role { get; set; } = null!;

    [BsonElement("auth_method")]
    public string AuthMethod { get; set; } = null!;

    [BsonElement("password_hash")]
    public string? PasswordHash { get; set; }

    [BsonElement("google_id")]
    public string? GoogleId { get; set; }

    [BsonElement("enrolled_classrooms")]
    public List<string> EnrolledClassrooms { get; set; } = new();

    [BsonElement("two_factor_secret")]
    public string? TwoFactorSecret { get; set; }

    [BsonElement("two_factor_enabled")]
    public bool TwoFactorEnabled { get; set; } = false;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
