using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Config
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("key")]
    public string Key { get; set; } = null!;

    [BsonElement("value")]
    public string Value { get; set; } = null!;
}
