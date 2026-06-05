using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace EduPlatform.Api.Services;

public class LiveKitService
{
    private readonly IConfiguration _config;

    public LiveKitService(IConfiguration config) => _config = config;

    public string GenerateToken(string identity, string name, string roomName, bool canPublish)
    {
        var apiKey    = _config["LiveKit:ApiKey"]!;
        var apiSecret = _config["LiveKit:ApiSecret"]!;
        var key       = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(apiSecret));

        var descriptor = new SecurityTokenDescriptor
        {
            Claims = new Dictionary<string, object>
            {
                ["iss"]   = apiKey,
                ["sub"]   = identity,
                ["name"]  = name,
                ["video"] = new Dictionary<string, object>
                {
                    ["room"]           = roomName,
                    ["roomJoin"]       = true,
                    ["canPublish"]     = canPublish,
                    ["canPublishData"] = true,
                    ["canSubscribe"]   = true,
                },
            },
            NotBefore          = DateTime.UtcNow,
            Expires            = DateTime.UtcNow.AddHours(2),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
