using EduPlatform.Api.Data;
using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/classrooms")]
public class ClassroomController : ControllerBase
{
    private readonly ClassroomService _classrooms;
    private readonly MongoDbContext _db;

    public ClassroomController(ClassroomService classrooms, MongoDbContext db)
    {
        _classrooms = classrooms;
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();

        if (role == "teacher")
        {
            var list = await _classrooms.GetByTeacherAsync(userId);
            return Ok(list.Select(c => Map(c)));
        }
        else
        {
            var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null) return Unauthorized();
            var list = await _classrooms.GetByStudentAsync(user.EnrolledClassrooms);
            return Ok(list.Select(c => Map(c)));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClassroomRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Forbidden" });
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name required" });

        var (classroom, channels) = await _classrooms.CreateAsync(req.Name, userId);
        return StatusCode(201, Map(classroom, channels));
    }

    [HttpPost("join")]
    public async Task<IActionResult> Join([FromBody] JoinRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var classroom = await _classrooms.JoinByCodeAsync(req.JoinCode, userId);
        if (classroom == null) return NotFound(new { error = "Invalid join code or already enrolled" });

        return Ok(Map(classroom));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Forbidden" });

        var classroom = await _classrooms.GetByIdAsync(id);
        if (classroom == null) return NotFound();
        if (classroom.TeacherId != userId) return StatusCode(403, new { error = "You don't own this classroom" });

        await _classrooms.DeleteAsync(id);
        return NoContent();
    }

    [HttpDelete("{id}/leave")]
    public async Task<IActionResult> Leave(string id)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role == "teacher") return StatusCode(403, new { error = "Teachers cannot leave a classroom" });

        // Verify the student is actually enrolled (uses string comparison, avoids ObjectId parsing issues)
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();
        if (!user.EnrolledClassrooms.Contains(id))
            return NotFound(new { error = "Not enrolled in this classroom" });

        await _classrooms.LeaveAsync(id, userId);
        return NoContent();
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> Get(string id)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();

        var classroom = await _classrooms.GetByIdAsync(id);
        if (classroom == null) return NotFound();

        var channels = await _db.Channels.Find(c => c.ClassroomId == id).ToListAsync();
        var members  = await _db.Users.Find(u => u.EnrolledClassrooms.Contains(id)).ToListAsync();

        return Ok(new
        {
            classroom.Id, classroom.Name, classroom.JoinCode, classroom.TeacherId, classroom.CreatedAt,
            Channels = channels.Select(c => new { c.Id, c.Name, c.Type }),
            Members  = members.Select(m => new { m.Id, m.Name, m.Email }),
        });
    }

    private static object Map(Models.Classroom c, List<Models.Channel>? channels = null) => new
    {
        c.Id, c.Name, c.JoinCode, c.TeacherId, c.CreatedAt,
        Channels = channels?.Select(ch => new { ch.Id, ch.Name, ch.Type })
    };
}

public record CreateClassroomRequest(string Name);
public record JoinRequest(string JoinCode);
