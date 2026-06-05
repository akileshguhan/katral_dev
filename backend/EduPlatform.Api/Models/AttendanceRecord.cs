using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class AttendanceRecord
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string SessionId      { get; set; } = "";
    public string ClassroomId    { get; set; } = "";
    public string SessionTitle   { get; set; } = "";
    public DateTime TakenAt      { get; set; } = DateTime.UtcNow;
    public string TakenByUserId  { get; set; } = "";
    public List<AttendeeInfo> PresentStudents { get; set; } = new();
}

public class AttendeeInfo
{
    public string UserId { get; set; } = "";
    public string Name   { get; set; } = "";
}
