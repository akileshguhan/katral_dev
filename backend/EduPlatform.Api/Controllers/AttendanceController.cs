using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class AttendanceController : ControllerBase
{
    private readonly AttendanceService _attendance;

    public AttendanceController(AttendanceService attendance) => _attendance = attendance;

    /// <summary>Teacher snaps attendance at this exact moment.</summary>
    [HttpPost("api/sessions/{sessionId}/attendance")]
    public async Task<IActionResult> Take(string sessionId)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Only teachers can take attendance" });

        try
        {
            var record = await _attendance.TakeAsync(sessionId, userId);
            return Ok(new
            {
                record.Id,
                record.SessionId,
                record.SessionTitle,
                record.TakenAt,
                PresentCount = record.PresentStudents.Count,
                PresentStudents = record.PresentStudents.Select(s => new { s.UserId, s.Name }),
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>List all attendance snapshots for a session.</summary>
    [HttpGet("api/sessions/{sessionId}/attendance")]
    public async Task<IActionResult> GetBySession(string sessionId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var records = await _attendance.GetBySessionAsync(sessionId);
        return Ok(records.Select(r => new
        {
            r.Id,
            r.SessionId,
            r.SessionTitle,
            r.TakenAt,
            PresentCount = r.PresentStudents.Count,
            PresentStudents = r.PresentStudents.Select(s => new { s.UserId, s.Name }),
        }));
    }

    /// <summary>All attendance records across all sessions in a classroom.</summary>
    [HttpGet("api/classrooms/{classroomId}/attendance")]
    public async Task<IActionResult> GetByClassroom(string classroomId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var records = await _attendance.GetByClassroomAsync(classroomId);
        return Ok(records.Select(r => new
        {
            r.Id,
            r.SessionId,
            r.SessionTitle,
            r.TakenAt,
            PresentCount = r.PresentStudents.Count,
            PresentStudents = r.PresentStudents.Select(s => new { s.UserId, s.Name }),
        }));
    }

    /// <summary>Student's own attendance history.</summary>
    [HttpGet("api/me/attendance")]
    public async Task<IActionResult> GetMine()
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();
        var records = await _attendance.GetForStudentAsync(userId);
        return Ok(records.Select(r => new
        {
            r.Id,
            r.SessionId,
            r.SessionTitle,
            r.ClassroomId,
            r.TakenAt,
        }));
    }
}
