using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

namespace EduPlatform.Api.Middleware;

public class JwtMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IConfiguration _config;

    public JwtMiddleware(RequestDelegate next, IConfiguration config)
    {
        _next = next;
        _config = config;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var token = context.Request.Headers["Authorization"]
            .FirstOrDefault()?.Split(" ").Last();

        if (token != null)
            AttachUser(context, token);

        await _next(context);
    }

    private void AttachUser(HttpContext context, string token)
    {
        try
        {
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!);
            var handler = new JwtSecurityTokenHandler();
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = false,
                ClockSkew = TimeSpan.Zero
            }, out var validated);

            var jwt = (JwtSecurityToken)validated;
            context.Items["UserId"]    = jwt.Claims.First(c => c.Type == "sub").Value;
            context.Items["UserRole"]  = jwt.Claims.First(c => c.Type == "role").Value;
            context.Items["UserEmail"] = jwt.Claims.First(c => c.Type == "email").Value;
            context.Items["UserName"]  = jwt.Claims.First(c => c.Type == "name").Value;
        }
        catch { /* invalid token — request proceeds unauthenticated */ }
    }
}
