using EduPlatform.Api.Models;
using EduPlatform.Api.Services;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;

namespace EduPlatform.Api.Tests;

public class AuthServiceTests
{
    private static IConfiguration BuildConfig() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = "test-secret-key-minimum-32-characters!!",
                ["Jwt:Issuer"] = "kattral-api",
                ["Jwt:ExpiryHours"] = "1"
            }).Build();

    [Fact]
    public void GenerateJwt_ReturnsNonEmptyToken()
    {
        var config = BuildConfig();
        var service = new AuthService(null!, config);

        var user = new User { Id = "507f1f77bcf86cd799439011", Email = "t@t.com", Name = "Test", Role = "teacher" };
        var token = service.GenerateJwt(user);

        Assert.False(string.IsNullOrEmpty(token));
        Assert.Equal(2, token.Count(c => c == '.')); // JWT = 3 parts separated by 2 dots
    }

    [Fact]
    public void GenerateJwt_TokenContainsRole()
    {
        var config = BuildConfig();
        var service = new AuthService(null!, config);

        var user = new User { Id = "507f1f77bcf86cd799439011", Email = "t@t.com", Name = "Test", Role = "student" };
        var token = service.GenerateJwt(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal("student", jwt.Claims.First(c => c.Type == "role").Value);
    }

    [Fact]
    public void GenerateJwt_TokenContainsAllClaims()
    {
        var config = BuildConfig();
        var service = new AuthService(null!, config);

        var user = new User { Id = "507f1f77bcf86cd799439011", Email = "test@example.com", Name = "Test User", Role = "teacher" };
        var token = service.GenerateJwt(user);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal("507f1f77bcf86cd799439011", jwt.Claims.First(c => c.Type == "sub").Value);
        Assert.Equal("test@example.com", jwt.Claims.First(c => c.Type == "email").Value);
        Assert.Equal("Test User", jwt.Claims.First(c => c.Type == "name").Value);
        Assert.Equal("teacher", jwt.Claims.First(c => c.Type == "role").Value);
    }
}
