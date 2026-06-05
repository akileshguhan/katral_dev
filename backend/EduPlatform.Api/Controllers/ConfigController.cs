using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class ConfigController : ControllerBase
{
    private readonly ConfigService _config;

    public ConfigController(ConfigService config) => _config = config;

    [HttpGet("api/config")]
    public async Task<IActionResult> Get()
    {
        var engine = await _config.GetVideoEngineAsync();
        return Ok(new { videoEngine = engine });
    }

    [HttpPut("api/config/video-engine")]
    public async Task<IActionResult> SetVideoEngine([FromBody] SetEngineRequest req)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        if (HttpContext.Items["UserRole"] as string != "teacher") return StatusCode(403, new { error = "Forbidden" });
        if (req.VideoEngine is not ("livekit" or "plugnmeet"))
            return BadRequest(new { error = "Invalid engine. Must be 'livekit' or 'plugnmeet'" });

        await _config.SetVideoEngineAsync(req.VideoEngine);
        return Ok(new { videoEngine = req.VideoEngine });
    }
}

public record SetEngineRequest(string VideoEngine);
