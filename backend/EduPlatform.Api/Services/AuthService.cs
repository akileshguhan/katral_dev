using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace EduPlatform.Api.Services;

public class AuthService
{
    private readonly MongoDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(MongoDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public string GenerateJwt(User user)
    {
        var key = Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!);
        var claims = new[]
        {
            new Claim("sub",   user.Id    ?? ""),
            new Claim("email", user.Email ?? ""),
            new Claim("name",  user.Name  ?? ""),
            new Claim("role",  user.Role  ?? ""),
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(int.Parse(_config["Jwt:ExpiryHours"]!)),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public async Task<User?> RegisterAsync(string email, string name, string password, string role)
    {
        var existing = await _db.Users.Find(u => u.Email == email).FirstOrDefaultAsync();
        if (existing != null) return null;

        var user = new User
        {
            Email        = email,
            Name         = name,
            Role         = role,
            AuthMethod   = "credentials",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
        };
        await _db.Users.InsertOneAsync(user);
        return user;
    }

    public async Task<User?> LoginAsync(string email, string password)
    {
        var user = await _db.Users.Find(u => u.Email == email).FirstOrDefaultAsync();
        if (user?.PasswordHash == null) return null;
        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash)) return null;
        return user;
    }

    public async Task<User> UpsertGoogleUserAsync(string googleId, string email, string name)
    {
        var user = await _db.Users.Find(u => u.Email == email).FirstOrDefaultAsync();
        if (user != null)
        {
            if (user.GoogleId == null)
            {
                var update = Builders<User>.Update.Set(u => u.GoogleId, googleId);
                await _db.Users.UpdateOneAsync(u => u.Id == user.Id, update);
            }
            return user;
        }
        var newUser = new User
        {
            Email      = email,
            Name       = name,
            Role       = "",          // role chosen once during onboarding, never defaulted
            AuthMethod = "google",
            GoogleId   = googleId,
        };
        await _db.Users.InsertOneAsync(newUser);
        return newUser;
    }

    public async Task<bool> UpdateRoleAsync(string userId, string role)
    {
        var update = Builders<User>.Update.Set(u => u.Role, role);
        var result = await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> HasRoleAsync(string userId)
    {
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        return user != null && !string.IsNullOrEmpty(user.Role);
    }

    public async Task<User?> UpdateProfileAsync(string userId, string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return null;
        var update = Builders<User>.Update.Set(u => u.Name, name.Trim());
        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
    }

    public async Task<(bool success, string error)> ChangePasswordAsync(string userId, string currentPassword, string newPassword)
    {
        var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null) return (false, "User not found");

        if (user.AuthMethod == "google")
            return (false, "Google accounts cannot set a password here");

        if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
            !BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return (false, "Current password is incorrect");

        if (newPassword.Length < 8)
            return (false, "New password must be at least 8 characters");

        var update = Builders<User>.Update.Set(u => u.PasswordHash, BCrypt.Net.BCrypt.HashPassword(newPassword));
        await _db.Users.UpdateOneAsync(u => u.Id == userId, update);
        return (true, "");
    }
}
