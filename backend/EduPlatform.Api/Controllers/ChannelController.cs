using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class ChannelController : ControllerBase
{
    private readonly ChannelService _channels;
    private readonly ClassroomService _classrooms;

    public ChannelController(ChannelService channels, ClassroomService classrooms)
    {
        _channels   = channels;
        _classrooms = classrooms;
    }

    [HttpGet("api/classrooms/{classroomId}/channels")]
    public async Task<IActionResult> List(string classroomId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var list = await _channels.GetByClassroomAsync(classroomId);
        return Ok(list.Select(c => new { c.Id, c.Name, c.Type, c.CreatedAt }));
    }

    [HttpPost("api/classrooms/{classroomId}/channels")]
    public async Task<IActionResult> Create(string classroomId, [FromBody] CreateChannelRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return StatusCode(403, new { error = "Forbidden" });
        if (!ChannelService.IsValidType(req.Type)) return BadRequest(new { error = "Invalid type" });

        var channel = await _channels.CreateAsync(classroomId, req.Name, req.Type);
        return StatusCode(201, new { channel.Id, channel.Name, channel.Type, channel.CreatedAt });
    }

    [HttpGet("api/channels/{channelId}/messages")]
    public async Task<IActionResult> GetMessages(string channelId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var messages = await _channels.GetMessagesAsync(channelId);
        return Ok(messages.Select(m => new
        {
            m.Id, m.Content, m.CreatedAt,
            Sender = new { m.SenderId, m.SenderName }
        }));
    }

    [HttpPost("api/channels/{channelId}/messages")]
    public async Task<IActionResult> SendMessage(string channelId, [FromBody] SendMessageRequest req)
    {
        var userId   = HttpContext.Items["UserId"]   as string;
        var userName = HttpContext.Items["UserName"] as string;
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Content)) return BadRequest(new { error = "Content required" });

        var msg = await _channels.SendMessageAsync(channelId, userId, userName!, req.Content);
        return CreatedAtAction(null, new { id = msg.Id }, new
        {
            msg.Id, msg.Content, msg.CreatedAt,
            Sender = new { msg.SenderId, msg.SenderName }
        });
    }
}

public record CreateChannelRequest(string Name, string Type);
public record SendMessageRequest(string Content);
