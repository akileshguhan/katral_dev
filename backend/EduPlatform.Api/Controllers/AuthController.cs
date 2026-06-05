using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using EduPlatform.Api.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly IConfiguration _config;
    private readonly MongoDbContext _db;

    public AuthController(AuthService auth, IConfiguration config, MongoDbContext db)
    {
        _auth = auth;
        _config = config;
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Password) ||
            string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "Invalid input" });

        // Role is optional at registration — it is set via PATCH /auth/role during onboarding
        var role = req.Role is "teacher" or "student" ? req.Role : "";
        var user = await _auth.RegisterAsync(req.Email, req.Name, req.Password, role);
        if (user == null) return Conflict(new { error = "Email already in use" });

        return Ok(new { token = _auth.GenerateJwt(user), user = new { user.Id, user.Email, user.Name, user.Role } });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await _auth.LoginAsync(req.Email, req.Password);
        if (user == null) return Unauthorized(new { error = "Invalid credentials" });

        return Ok(new { token = _auth.GenerateJwt(user), user = new { user.Id, user.Email, user.Name, user.Role } });
    }

    [HttpPost("google")]
    public async Task<IActionResult> Google([FromBody] GoogleRequest req)
    {
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _config["Google:ClientId"] }
                });

            var user = await _auth.UpsertGoogleUserAsync(payload.Subject, payload.Email, payload.Name);
            return Ok(new { token = _auth.GenerateJwt(user), user = new { user.Id, user.Email, user.Name, user.Role } });
        }
        catch
        {
            return Unauthorized(new { error = "Invalid Google token" });
        }
    }

    [HttpPatch("role")]
    public async Task<IActionResult> UpdateRole([FromBody] RoleRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();
        if (req.Role != "teacher" && req.Role != "student") return BadRequest(new { error = "Invalid role" });

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        // Role is set once during onboarding — never changeable after that
        if (!string.IsNullOrEmpty(user.Role))
            return StatusCode(403, new { error = "Role is already set and cannot be changed" });

        await _auth.UpdateRoleAsync(userId, req.Role);
        user.Role = req.Role;
        var newToken = _auth.GenerateJwt(user);
        return Ok(new { role = req.Role, token = newToken });
    }

    [HttpPost("switch-role")]
    public async Task<IActionResult> SwitchRole()
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        string newRole;
        if (user.Role == "teacher")
        {
            var classroomCount = await _db.Classrooms
                .CountDocumentsAsync(c => c.TeacherId == userId);
            if (classroomCount > 0)
                return StatusCode(409, new { error = $"Delete all {classroomCount} classroom(s) before switching to student." });
            newRole = "student";
        }
        else if (user.Role == "student")
        {
            if (user.EnrolledClassrooms.Count > 0)
                return StatusCode(409, new { error = $"Leave all {user.EnrolledClassrooms.Count} classroom(s) before switching to teacher." });
            newRole = "teacher";
        }
        else
        {
            return BadRequest(new { error = "No role set." });
        }

        await _auth.UpdateRoleAsync(userId, newRole);
        user.Role = newRole;
        var newToken = _auth.GenerateJwt(user);
        return Ok(new { role = newRole, token = newToken });
    }

    [HttpPatch("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name cannot be empty" });

        var user = await _auth.UpdateProfileAsync(userId, req.Name);
        if (user == null) return NotFound(new { error = "User not found" });

        return Ok(new { token = _auth.GenerateJwt(user), user = new { user.Id, user.Email, user.Name, user.Role } });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(req.CurrentPassword) || string.IsNullOrWhiteSpace(req.NewPassword))
            return BadRequest(new { error = "Both passwords are required" });

        var (success, error) = await _auth.ChangePasswordAsync(userId, req.CurrentPassword, req.NewPassword);
        if (!success) return BadRequest(new { error });

        return Ok(new { message = "Password updated successfully" });
    }

    // ── 2FA ──────────────────────────────────────────────────────────────────
    [HttpPost("2fa/setup")]
    public async Task<IActionResult> TwoFactorSetup()
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();
        if (user.TwoFactorEnabled) return BadRequest(new { error = "2FA is already enabled" });

        var secret = TotpService.GenerateSecret();
        var update = Builders<User>.Update.Set(u => u.TwoFactorSecret, secret);
        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);

        var uri = TotpService.GetOtpAuthUri(secret, user.Email);
        return Ok(new { secret, uri });
    }

    [HttpPost("2fa/verify")]
    public async Task<IActionResult> TwoFactorVerify([FromBody] TwoFactorRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null || string.IsNullOrEmpty(user.TwoFactorSecret))
            return BadRequest(new { error = "Run 2FA setup first" });

        if (!TotpService.Verify(user.TwoFactorSecret, req.Code))
            return BadRequest(new { error = "Invalid code. Check your authenticator app and try again." });

        var update = Builders<User>.Update.Set(u => u.TwoFactorEnabled, true);
        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return Ok(new { message = "2FA enabled" });
    }

    [HttpDelete("2fa")]
    public async Task<IActionResult> TwoFactorDisable([FromBody] TwoFactorRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();
        if (!user.TwoFactorEnabled) return BadRequest(new { error = "2FA is not enabled" });

        if (!TotpService.Verify(user.TwoFactorSecret!, req.Code))
            return BadRequest(new { error = "Invalid code" });

        var update = Builders<User>.Update
            .Set(u => u.TwoFactorEnabled, false)
            .Unset(u => u.TwoFactorSecret);
        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return Ok(new { message = "2FA disabled" });
    }

    // ── Delete Account ────────────────────────────────────────────────────────
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return Unauthorized();

        if (user.AuthMethod == "credentials")
        {
            if (string.IsNullOrEmpty(req.Password) ||
                string.IsNullOrEmpty(user.PasswordHash) ||
                !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
                return BadRequest(new { error = "Incorrect password" });
        }

        await _db.Users.DeleteOneAsync(u => u.Id == userId);
        return Ok(new { message = "Account deleted" });
    }

    // Server-to-server endpoint: Next.js jwt callback calls this to recover a backend token
    // when the initial Google OAuth backend call failed silently.
    [HttpPost("s2s-token")]
    public async Task<IActionResult> S2sToken([FromBody] S2sRequest req)
    {
        var provided = Request.Headers["X-Server-Secret"].FirstOrDefault();
        var expected = _config["Jwt:Secret"];
        if (string.IsNullOrEmpty(provided) || provided != expected)
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { error = "Email required" });

        var user = await _db.Users.Find(u => u.Email == req.Email).FirstOrDefaultAsync();
        if (user == null)
        {
            user = new User { Email = req.Email, Name = req.Name ?? req.Email, Role = "", AuthMethod = "oauth" };
            await _db.Users.InsertOneAsync(user);
        }

        return Ok(new { token = _auth.GenerateJwt(user), user = new { user.Id, user.Email, user.Name, user.Role } });
    }
}

public record RegisterRequest(string Email, string Name, string Password, string? Role);
public record LoginRequest(string Email, string Password);
public record GoogleRequest(string IdToken);
public record RoleRequest(string Role);
public record S2sRequest(string Email, string? Name);
public record UpdateProfileRequest(string Name);
public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
public record TwoFactorRequest(string Code);
public record DeleteAccountRequest(string? Password);
