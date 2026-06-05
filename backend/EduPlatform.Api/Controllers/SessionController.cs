using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class SessionController : ControllerBase
{
    private readonly SessionService    _sessions;
    private readonly ClassroomService  _classrooms;
    private readonly LiveKitService    _liveKit;
    private readonly IConfiguration    _config;
    private readonly MongoDbContext    _db;

    public SessionController(
        SessionService   sessions,
        ClassroomService classrooms,
        LiveKitService   liveKit,
        IConfiguration   config,
        MongoDbContext   db)
    {
        _sessions   = sessions;
        _classrooms = classrooms;
        _liveKit    = liveKit;
        _config     = config;
        _db         = db;
    }

    [HttpGet("api/classrooms/{classroomId}/sessions")]
    public async Task<IActionResult> List(string classroomId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var list = await _sessions.GetByClassroomAsync(classroomId);
        return Ok(list.Select(s => new { s.Id, s.Title, s.Status, s.RoomId, s.ScheduledAt, s.DurationMinutes, s.CreatedAt }));
    }

    [HttpPost("api/classrooms/{classroomId}/sessions")]
    public async Task<IActionResult> Create(string classroomId, [FromBody] CreateSessionRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Forbidden" });
        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest(new { error = "Title required" });

        var session = await _sessions.CreateAsync(classroomId, req.Title, req.ScheduledAt, req.DurationMinutes);

        if (req.ScheduledAt.HasValue)
        {
            var classroom = await _classrooms.GetByIdAsync(classroomId);
            if (classroom != null)
            {
                var students = await _db.Users
                    .Find(u => u.EnrolledClassrooms.Contains(classroomId))
                    .ToListAsync();

                var when = req.ScheduledAt.Value.ToLocalTime().ToString("MMM d 'at' h:mm tt");
                var notifs = students.Select(s => new Notification
                {
                    UserId      = s.Id,
                    Title       = $"New session: {req.Title}",
                    Body        = $"{classroom.Name} · Scheduled for {when}",
                    SessionId   = session.Id,
                    ClassroomId = classroomId,
                }).ToList();

                if (notifs.Count > 0)
                    await _db.Notifications.InsertManyAsync(notifs);
            }
        }

        return StatusCode(201, new { session.Id, session.Title, session.Status, session.ScheduledAt, session.DurationMinutes, session.CreatedAt });
    }

    [HttpGet("api/sessions/{sessionId}/status")]
    public async Task<IActionResult> GetStatus(string sessionId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var session = await _sessions.GetByIdAsync(sessionId);
        if (session == null) return NotFound();
        return Ok(new { session.Status });
    }

    [HttpPost("api/sessions/{sessionId}/start")]
    public async Task<IActionResult> Start(string sessionId)
    {
        var userId   = HttpContext.Items["UserId"]   as string;
        var userName = HttpContext.Items["UserName"] as string;
        var role     = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Forbidden" });

        var session = await _sessions.StartAsync(sessionId);
        if (session == null) return NotFound();
        if (session.RoomId == null) return StatusCode(500, new { error = "Session has no room ID" });

        var token = _liveKit.GenerateToken(userId, userName!, session.RoomId, canPublish: true);
        var url   = _config["LiveKit:Url"]!;

        return Ok(new { engine = "livekit", token, url });
    }

    [HttpPost("api/sessions/{sessionId}/join")]
    public async Task<IActionResult> Join(string sessionId)
    {
        var userId   = HttpContext.Items["UserId"]   as string;
        var userName = HttpContext.Items["UserName"] as string;
        if (userId == null) return Unauthorized();

        var session = await _sessions.GetByIdAsync(sessionId);
        if (session == null) return NotFound();
        if (session.Status != "live") return BadRequest(new { error = "Session is not live" });
        if (session.RoomId == null) return StatusCode(500, new { error = "Session has no room ID" });

        var token = _liveKit.GenerateToken(userId, userName!, session.RoomId, canPublish: true);
        var url   = _config["LiveKit:Url"]!;

        return Ok(new { engine = "livekit", token, url });
    }

    [HttpPost("api/sessions/{sessionId}/end")]
    public async Task<IActionResult> End(string sessionId)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Forbidden" });

        await _sessions.EndAsync(sessionId);
        return NoContent();
    }
}

public record CreateSessionRequest(string Title, DateTime? ScheduledAt, int? DurationMinutes);
