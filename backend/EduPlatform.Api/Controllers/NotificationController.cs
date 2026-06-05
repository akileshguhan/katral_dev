using EduPlatform.Api.Data;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class NotificationController : ControllerBase
{
    private readonly MongoDbContext _db;

    public NotificationController(MongoDbContext db) => _db = db;

    [HttpGet("api/notifications")]
    public async Task<IActionResult> List()
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var items = await _db.Notifications
            .Find(n => n.UserId == userId && !n.Read)
            .SortByDescending(n => n.CreatedAt)
            .Limit(30)
            .ToListAsync();

        return Ok(items.Select(n => new
        {
            n.Id, n.Title, n.Body, n.SessionId, n.ClassroomId, n.CreatedAt
        }));
    }

    [HttpPatch("api/notifications/read-all")]
    public async Task<IActionResult> ReadAll()
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        await _db.Notifications.UpdateManyAsync(
            n => n.UserId == userId && !n.Read,
            Builders<Models.Notification>.Update.Set(n => n.Read, true));

        return Ok();
    }
}
