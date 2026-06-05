# Kattral Academy — .NET 8 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade .NET 8 Web API backed by MongoDB Atlas that handles auth (Google OAuth + email/password), classrooms, channels, messages, and LiveKit session management.

**Architecture:** JwtMiddleware validates Bearer tokens on every request with no DB hit. Services contain all business logic and are injected into thin controllers. MongoDbContext wraps IMongoCollection per model.

**Tech Stack:** .NET 8, MongoDB.Driver, BCrypt.Net-Next, System.IdentityModel.Tokens.Jwt, xUnit, Moq

---

## File Map

```
backend/
├── EduPlatform.Api/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── ClassroomController.cs
│   │   ├── ChannelController.cs
│   │   └── SessionController.cs
│   ├── Data/
│   │   └── MongoDbContext.cs
│   ├── Middleware/
│   │   └── JwtMiddleware.cs
│   ├── Models/
│   │   ├── User.cs
│   │   ├── Classroom.cs
│   │   ├── Session.cs
│   │   ├── Channel.cs
│   │   └── Message.cs
│   ├── Services/
│   │   ├── AuthService.cs
│   │   ├── ClassroomService.cs
│   │   ├── ChannelService.cs
│   │   ├── SessionService.cs
│   │   └── LiveKitService.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   └── Program.cs
└── EduPlatform.Api.Tests/
    ├── AuthServiceTests.cs
    ├── ClassroomServiceTests.cs
    ├── ChannelServiceTests.cs
    └── SessionServiceTests.cs
```

---

### Task 1: Scaffold project + install packages

**Files:**
- Create: `backend/EduPlatform.Api/EduPlatform.Api.csproj`
- Create: `backend/EduPlatform.Api.Tests/EduPlatform.Api.Tests.csproj`

- [ ] **Step 1: Create solution and projects**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
mkdir -p backend && cd backend
dotnet new webapi -n EduPlatform.Api --no-openapi
dotnet new xunit -n EduPlatform.Api.Tests
dotnet new sln -n EduPlatform
dotnet sln add EduPlatform.Api/EduPlatform.Api.csproj
dotnet sln add EduPlatform.Api.Tests/EduPlatform.Api.Tests.csproj
dotnet add EduPlatform.Api.Tests/EduPlatform.Api.Tests.csproj reference EduPlatform.Api/EduPlatform.Api.csproj
```

- [ ] **Step 2: Install API packages**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend/EduPlatform.Api
dotnet add package MongoDB.Driver --version 3.0.0
dotnet add package BCrypt.Net-Next --version 4.0.3
dotnet add package Microsoft.IdentityModel.Tokens --version 8.0.0
dotnet add package System.IdentityModel.Tokens.Jwt --version 8.0.0
dotnet add package Google.Apis.Auth --version 1.68.0
```

- [ ] **Step 3: Install test packages**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend/EduPlatform.Api.Tests
dotnet add package Moq --version 4.20.72
dotnet add package Microsoft.Extensions.Configuration --version 8.0.0
dotnet add package Microsoft.Extensions.Configuration.Memory --version 8.0.0
```

- [ ] **Step 4: Delete boilerplate files**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend/EduPlatform.Api
rm -f Controllers/WeatherForecastController.cs WeatherForecast.cs
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 6: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/
git commit -m "chore: scaffold .NET 8 backend + test project"
```

---

### Task 2: Configuration (appsettings + Program.cs)

**Files:**
- Modify: `backend/EduPlatform.Api/appsettings.json`
- Create: `backend/EduPlatform.Api/appsettings.Development.json`
- Modify: `backend/EduPlatform.Api/Program.cs`

- [ ] **Step 1: Write appsettings.json**

```json
{
  "MongoDB": {
    "ConnectionString": "",
    "DatabaseName": "kattral_academy"
  },
  "Jwt": {
    "Secret": "",
    "Issuer": "kattral-api",
    "ExpiryHours": "1"
  },
  "LiveKit": {
    "ApiKey": "YOUR_LIVEKIT_API_KEY",
    "ApiSecret": "YOUR_LIVEKIT_API_SECRET",
    "Url": "wss://katral-zonddr6x.livekit.cloud"
  },
  "Google": {
    "ClientId": "your-google-client-id-here"
  },
  "Logging": {
    "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Step 2: Write appsettings.Development.json (fill MongoDB + JWT before running)**

```json
{
  "MongoDB": {
    "ConnectionString": "mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority",
    "DatabaseName": "kattral_academy"
  },
  "Jwt": {
    "Secret": "change-this-to-a-32-char-minimum-secret-key",
    "Issuer": "kattral-api",
    "ExpiryHours": "1"
  }
}
```

- [ ] **Step 3: Write Program.cs**

```csharp
using EduPlatform.Api.Data;
using EduPlatform.Api.Middleware;
using EduPlatform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDB"));

builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ClassroomService>();
builder.Services.AddScoped<ChannelService>();
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<LiveKitService>();

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

app.UseCors();
app.UseMiddleware<JwtMiddleware>();
app.MapControllers();

app.Run();
```

- [ ] **Step 4: Verify build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 5: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/appsettings.json backend/EduPlatform.Api/appsettings.Development.json backend/EduPlatform.Api/Program.cs
git commit -m "chore: configure MongoDB, JWT, CORS, and DI in Program.cs"
```

---

### Task 3: MongoDB models + context

**Files:**
- Create: `backend/EduPlatform.Api/Models/User.cs`
- Create: `backend/EduPlatform.Api/Models/Classroom.cs`
- Create: `backend/EduPlatform.Api/Models/Session.cs`
- Create: `backend/EduPlatform.Api/Models/Channel.cs`
- Create: `backend/EduPlatform.Api/Models/Message.cs`
- Create: `backend/EduPlatform.Api/Data/MongoDbContext.cs`

- [ ] **Step 1: Write User.cs**

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("role")]
    public string Role { get; set; } = null!;

    [BsonElement("auth_method")]
    public string AuthMethod { get; set; } = null!;

    [BsonElement("password_hash")]
    public string? PasswordHash { get; set; }

    [BsonElement("google_id")]
    public string? GoogleId { get; set; }

    [BsonElement("enrolled_classrooms")]
    public List<string> EnrolledClassrooms { get; set; } = new();

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 2: Write Classroom.cs**

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Classroom
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("teacher_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TeacherId { get; set; } = null!;

    [BsonElement("join_code")]
    public string JoinCode { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 3: Write Session.cs**

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Session
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("classroom_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ClassroomId { get; set; } = null!;

    [BsonElement("title")]
    public string Title { get; set; } = null!;

    [BsonElement("status")]
    public string Status { get; set; } = "waiting";

    [BsonElement("room_id")]
    public string? RoomId { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 4: Write Channel.cs**

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Channel
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("classroom_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ClassroomId { get; set; } = null!;

    [BsonElement("name")]
    public string Name { get; set; } = null!;

    [BsonElement("type")]
    public string Type { get; set; } = "general";

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 5: Write Message.cs**

```csharp
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Message
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("channel_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ChannelId { get; set; } = null!;

    [BsonElement("sender_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SenderId { get; set; } = null!;

    [BsonElement("sender_name")]
    public string SenderName { get; set; } = null!;

    [BsonElement("content")]
    public string Content { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

- [ ] **Step 6: Write MongoDbContext.cs**

```csharp
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using EduPlatform.Api.Models;

namespace EduPlatform.Api.Data;

public class MongoDbSettings
{
    public string ConnectionString { get; set; } = null!;
    public string DatabaseName { get; set; } = null!;
}

public class MongoDbContext
{
    private readonly IMongoDatabase _db;

    public MongoDbContext(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _db = client.GetDatabase(settings.Value.DatabaseName);
        EnsureIndexes();
    }

    public IMongoCollection<User> Users => _db.GetCollection<User>("users");
    public IMongoCollection<Classroom> Classrooms => _db.GetCollection<Classroom>("classrooms");
    public IMongoCollection<Session> Sessions => _db.GetCollection<Session>("sessions");
    public IMongoCollection<Channel> Channels => _db.GetCollection<Channel>("channels");
    public IMongoCollection<Message> Messages => _db.GetCollection<Message>("messages");

    private void EnsureIndexes()
    {
        Users.Indexes.CreateOne(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true }));

        Classrooms.Indexes.CreateOne(new CreateIndexModel<Classroom>(
            Builders<Classroom>.IndexKeys.Ascending(c => c.JoinCode),
            new CreateIndexOptions { Unique = true }));

        Sessions.Indexes.CreateOne(new CreateIndexModel<Session>(
            Builders<Session>.IndexKeys
                .Ascending(s => s.ClassroomId)
                .Ascending(s => s.Status)));

        Messages.Indexes.CreateOne(new CreateIndexModel<Message>(
            Builders<Message>.IndexKeys
                .Ascending(m => m.ChannelId)
                .Ascending(m => m.CreatedAt)));
    }
}
```

- [ ] **Step 7: Build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend && dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 8: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Models/ backend/EduPlatform.Api/Data/
git commit -m "feat: add MongoDB models and context with indexes"
```

---

### Task 4: JwtMiddleware

**Files:**
- Create: `backend/EduPlatform.Api/Middleware/JwtMiddleware.cs`

- [ ] **Step 1: Write JwtMiddleware.cs**

```csharp
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
```

- [ ] **Step 2: Build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend && dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Middleware/
git commit -m "feat: add JWT middleware for bearer token validation"
```

---

### Task 5: AuthService + tests

**Files:**
- Create: `backend/EduPlatform.Api/Services/AuthService.cs`
- Create: `backend/EduPlatform.Api.Tests/AuthServiceTests.cs`

- [ ] **Step 1: Write failing tests**

```csharp
// backend/EduPlatform.Api.Tests/AuthServiceTests.cs
using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using EduPlatform.Api.Services;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using Moq;

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
        var mockUsers = new Mock<IMongoCollection<User>>();
        var mockDb = new Mock<MongoDbContext>();
        var config = BuildConfig();
        var service = new AuthService(mockDb.Object, config);

        var user = new User { Id = "507f1f77bcf86cd799439011", Email = "t@t.com", Name = "Test", Role = "teacher" };
        var token = service.GenerateJwt(user);

        Assert.False(string.IsNullOrEmpty(token));
        Assert.Contains(".", token); // JWT has 3 dot-separated parts
    }

    [Fact]
    public void GenerateJwt_TokenContainsRole()
    {
        var mockDb = new Mock<MongoDbContext>();
        var config = BuildConfig();
        var service = new AuthService(mockDb.Object, config);

        var user = new User { Id = "507f1f77bcf86cd799439011", Email = "t@t.com", Name = "Test", Role = "student" };
        var token = service.GenerateJwt(user);

        // Decode and verify claim exists
        var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);
        Assert.Equal("student", jwt.Claims.First(c => c.Type == "role").Value);
    }
}
```

- [ ] **Step 2: Run tests to see them fail**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "AuthServiceTests"
```
Expected: compilation error — `AuthService` does not exist yet.

- [ ] **Step 3: Write AuthService.cs**

```csharp
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
            new Claim("sub",   user.Id),
            new Claim("email", user.Email),
            new Claim("name",  user.Name),
            new Claim("role",  user.Role),
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
            Role       = "student",
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
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "AuthServiceTests" -v
```
Expected: `Passed! - Failed: 0`

- [ ] **Step 5: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Services/AuthService.cs backend/EduPlatform.Api.Tests/AuthServiceTests.cs
git commit -m "feat: add AuthService with JWT, register, login, Google upsert"
```

---

### Task 6: AuthController

**Files:**
- Create: `backend/EduPlatform.Api/Controllers/AuthController.cs`

- [ ] **Step 1: Write AuthController.cs**

```csharp
using EduPlatform.Api.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly IConfiguration _config;

    public AuthController(AuthService auth, IConfiguration config)
    {
        _auth = auth;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Password) ||
            string.IsNullOrWhiteSpace(req.Name) ||
            (req.Role != "teacher" && req.Role != "student"))
            return BadRequest(new { error = "Invalid input" });

        var user = await _auth.RegisterAsync(req.Email, req.Name, req.Password, req.Role);
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

        await _auth.UpdateRoleAsync(userId, req.Role);
        return Ok(new { role = req.Role });
    }
}

public record RegisterRequest(string Email, string Name, string Password, string Role);
public record LoginRequest(string Email, string Password);
public record GoogleRequest(string IdToken);
public record RoleRequest(string Role);
```

- [ ] **Step 2: Build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend && dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Controllers/AuthController.cs
git commit -m "feat: add AuthController (register, login, google, role)"
```

---

### Task 7: ClassroomService + tests

**Files:**
- Create: `backend/EduPlatform.Api/Services/ClassroomService.cs`
- Create: `backend/EduPlatform.Api.Tests/ClassroomServiceTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
// backend/EduPlatform.Api.Tests/ClassroomServiceTests.cs
using EduPlatform.Api.Services;

namespace EduPlatform.Api.Tests;

public class ClassroomServiceTests
{
    [Fact]
    public void GenerateJoinCode_Returns6CharAlphanumeric()
    {
        var code = ClassroomService.GenerateJoinCode();

        Assert.Equal(6, code.Length);
        Assert.Matches("^[A-Z0-9]{6}$", code);
    }

    [Fact]
    public void GenerateJoinCode_ReturnsDifferentValuesOnRepeatedCalls()
    {
        var codes = Enumerable.Range(0, 20).Select(_ => ClassroomService.GenerateJoinCode()).ToList();
        // Very unlikely all 20 are the same
        Assert.True(codes.Distinct().Count() > 1);
    }
}
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "ClassroomServiceTests"
```
Expected: compilation error — `ClassroomService` does not exist.

- [ ] **Step 3: Write ClassroomService.cs**

```csharp
using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class ClassroomService
{
    private readonly MongoDbContext _db;

    public ClassroomService(MongoDbContext db) => _db = db;

    public static string GenerateJoinCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rng = new Random();
        return new string(Enumerable.Range(0, 6).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }

    public async Task<(Classroom classroom, List<Channel> channels)> CreateAsync(string name, string teacherId)
    {
        string code;
        do { code = GenerateJoinCode(); }
        while (await _db.Classrooms.Find(c => c.JoinCode == code).AnyAsync());

        var classroom = new Classroom { Name = name, TeacherId = teacherId, JoinCode = code };
        await _db.Classrooms.InsertOneAsync(classroom);

        var channels = new List<Channel>
        {
            new() { ClassroomId = classroom.Id, Name = "general",       Type = "general" },
            new() { ClassroomId = classroom.Id, Name = "announcements", Type = "announcement" },
            new() { ClassroomId = classroom.Id, Name = "resources",     Type = "resource" },
        };
        await _db.Channels.InsertManyAsync(channels);

        return (classroom, channels);
    }

    public async Task<List<Classroom>> GetByTeacherAsync(string teacherId) =>
        await _db.Classrooms.Find(c => c.TeacherId == teacherId).ToListAsync();

    public async Task<List<Classroom>> GetByStudentAsync(List<string> classroomIds) =>
        await _db.Classrooms.Find(c => classroomIds.Contains(c.Id)).ToListAsync();

    public async Task<Classroom?> GetByIdAsync(string id) =>
        await _db.Classrooms.Find(c => c.Id == id).FirstOrDefaultAsync();

    public async Task<Classroom?> JoinByCodeAsync(string code, string studentId)
    {
        var classroom = await _db.Classrooms.Find(c => c.JoinCode == code.ToUpper()).FirstOrDefaultAsync();
        if (classroom == null) return null;
        if (classroom.TeacherId == studentId) return null; // teacher can't join own class

        var update = Builders<Models.User>.Update.AddToSet(u => u.EnrolledClassrooms, classroom.Id);
        await _db.Users.UpdateOneAsync(u => u.Id == studentId, update);
        return classroom;
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "ClassroomServiceTests" -v
```
Expected: `Passed! - Failed: 0`

- [ ] **Step 5: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Services/ClassroomService.cs backend/EduPlatform.Api.Tests/ClassroomServiceTests.cs
git commit -m "feat: add ClassroomService with join code generation and enrollment"
```

---

### Task 8: ClassroomController

**Files:**
- Create: `backend/EduPlatform.Api/Controllers/ClassroomController.cs`

- [ ] **Step 1: Write ClassroomController.cs**

```csharp
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
            return Ok(list.Select(Map));
        }
        else
        {
            var user = await _db.Users.Find(u => u.Id == userId).FirstOrDefaultAsync();
            if (user == null) return Unauthorized();
            var list = await _classrooms.GetByStudentAsync(user.EnrolledClassrooms);
            return Ok(list.Select(Map));
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClassroomRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return Forbid();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name required" });

        var (classroom, channels) = await _classrooms.CreateAsync(req.Name, userId);
        return CreatedAtAction(null, new { id = classroom.Id }, Map(classroom, channels));
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
```

- [ ] **Step 2: Build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend && dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Controllers/ClassroomController.cs
git commit -m "feat: add ClassroomController (list, create, join, get)"
```

---

### Task 9: ChannelService + ChannelController

**Files:**
- Create: `backend/EduPlatform.Api/Services/ChannelService.cs`
- Create: `backend/EduPlatform.Api/Controllers/ChannelController.cs`
- Create: `backend/EduPlatform.Api.Tests/ChannelServiceTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
// backend/EduPlatform.Api.Tests/ChannelServiceTests.cs
using EduPlatform.Api.Services;

namespace EduPlatform.Api.Tests;

public class ChannelServiceTests
{
    [Theory]
    [InlineData("general")]
    [InlineData("announcement")]
    [InlineData("resource")]
    public void IsValidType_ReturnsTrueForValidTypes(string type)
    {
        Assert.True(ChannelService.IsValidType(type));
    }

    [Fact]
    public void IsValidType_ReturnsFalseForInvalidType()
    {
        Assert.False(ChannelService.IsValidType("invalid"));
    }
}
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "ChannelServiceTests"
```
Expected: compilation error.

- [ ] **Step 3: Write ChannelService.cs**

```csharp
using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class ChannelService
{
    private readonly MongoDbContext _db;

    public ChannelService(MongoDbContext db) => _db = db;

    public static bool IsValidType(string type) =>
        type is "general" or "announcement" or "resource";

    public async Task<List<Channel>> GetByClassroomAsync(string classroomId) =>
        await _db.Channels.Find(c => c.ClassroomId == classroomId).ToListAsync();

    public async Task<Channel> CreateAsync(string classroomId, string name, string type)
    {
        var channel = new Channel { ClassroomId = classroomId, Name = name, Type = type };
        await _db.Channels.InsertOneAsync(channel);
        return channel;
    }

    public async Task<List<Message>> GetMessagesAsync(string channelId) =>
        await _db.Messages
            .Find(m => m.ChannelId == channelId)
            .SortBy(m => m.CreatedAt)
            .Limit(100)
            .ToListAsync();

    public async Task<Message> SendMessageAsync(string channelId, string senderId, string senderName, string content)
    {
        var message = new Message
        {
            ChannelId  = channelId,
            SenderId   = senderId,
            SenderName = senderName,
            Content    = content,
        };
        await _db.Messages.InsertOneAsync(message);
        return message;
    }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "ChannelServiceTests" -v
```
Expected: `Passed! - Failed: 0`

- [ ] **Step 5: Write ChannelController.cs**

```csharp
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
        if (role != "teacher") return Forbid();
        if (!ChannelService.IsValidType(req.Type)) return BadRequest(new { error = "Invalid type" });

        var channel = await _channels.CreateAsync(classroomId, req.Name, req.Type);
        return CreatedAtAction(null, new { id = channel.Id },
            new { channel.Id, channel.Name, channel.Type, channel.CreatedAt });
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
```

- [ ] **Step 6: Build**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend && dotnet build
```
Expected: `Build succeeded.`

- [ ] **Step 7: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Services/ChannelService.cs backend/EduPlatform.Api/Controllers/ChannelController.cs backend/EduPlatform.Api.Tests/ChannelServiceTests.cs
git commit -m "feat: add ChannelService and ChannelController with messaging"
```

---

### Task 10: LiveKitService + SessionService + SessionController

**Files:**
- Create: `backend/EduPlatform.Api/Services/LiveKitService.cs`
- Create: `backend/EduPlatform.Api/Services/SessionService.cs`
- Create: `backend/EduPlatform.Api/Controllers/SessionController.cs`
- Create: `backend/EduPlatform.Api.Tests/SessionServiceTests.cs`

- [ ] **Step 1: Write failing test**

```csharp
// backend/EduPlatform.Api.Tests/SessionServiceTests.cs
using EduPlatform.Api.Services;

namespace EduPlatform.Api.Tests;

public class SessionServiceTests
{
    [Fact]
    public void BuildRoomId_ReturnsConsistentId()
    {
        var id = SessionService.BuildRoomId("abc123");
        Assert.Equal("session-abc123", id);
    }
}
```

- [ ] **Step 2: Run test — expect fail**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "SessionServiceTests"
```
Expected: compilation error.

- [ ] **Step 3: Write LiveKitService.cs**

```csharp
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

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

        var videoGrant = new
        {
            room      = roomName,
            roomJoin  = true,
            canPublish,
            canPublishData = true,
            canSubscribe   = true,
        };

        var claims = new[]
        {
            new Claim("iss",   apiKey),
            new Claim("sub",   identity),
            new Claim("name",  name),
            new Claim("video", JsonSerializer.Serialize(videoGrant)),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 4: Write SessionService.cs**

```csharp
using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class SessionService
{
    private readonly MongoDbContext _db;

    public SessionService(MongoDbContext db) => _db = db;

    public static string BuildRoomId(string sessionId) => $"session-{sessionId}";

    public async Task<List<Session>> GetByClassroomAsync(string classroomId) =>
        await _db.Sessions.Find(s => s.ClassroomId == classroomId)
            .SortByDescending(s => s.CreatedAt).ToListAsync();

    public async Task<Session> CreateAsync(string classroomId, string title)
    {
        var session = new Session { ClassroomId = classroomId, Title = title, Status = "waiting" };
        await _db.Sessions.InsertOneAsync(session);
        return session;
    }

    public async Task<Session?> StartAsync(string sessionId)
    {
        var session = await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();
        if (session == null) return null;

        var roomId = session.RoomId ?? BuildRoomId(sessionId);
        var update = Builders<Session>.Update
            .Set(s => s.Status, "live")
            .Set(s => s.RoomId, roomId);
        await _db.Sessions.UpdateOneAsync(s => s.Id == sessionId, update);
        session.Status = "live";
        session.RoomId = roomId;
        return session;
    }

    public async Task<Session?> GetByIdAsync(string sessionId) =>
        await _db.Sessions.Find(s => s.Id == sessionId).FirstOrDefaultAsync();

    public async Task EndAsync(string sessionId)
    {
        var update = Builders<Session>.Update.Set(s => s.Status, "ended");
        await _db.Sessions.UpdateOneAsync(s => s.Id == sessionId, update);
    }
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests --filter "SessionServiceTests" -v
```
Expected: `Passed! - Failed: 0`

- [ ] **Step 6: Write SessionController.cs**

```csharp
using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class SessionController : ControllerBase
{
    private readonly SessionService _sessions;
    private readonly LiveKitService _liveKit;
    private readonly ClassroomService _classrooms;

    public SessionController(SessionService sessions, LiveKitService liveKit, ClassroomService classrooms)
    {
        _sessions   = sessions;
        _liveKit    = liveKit;
        _classrooms = classrooms;
    }

    [HttpGet("api/classrooms/{classroomId}/sessions")]
    public async Task<IActionResult> List(string classroomId)
    {
        if (HttpContext.Items["UserId"] == null) return Unauthorized();
        var list = await _sessions.GetByClassroomAsync(classroomId);
        return Ok(list.Select(s => new { s.Id, s.Title, s.Status, s.RoomId, s.CreatedAt }));
    }

    [HttpPost("api/classrooms/{classroomId}/sessions")]
    public async Task<IActionResult> Create(string classroomId, [FromBody] CreateSessionRequest req)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return Forbid();
        if (string.IsNullOrWhiteSpace(req.Title)) return BadRequest(new { error = "Title required" });

        var session = await _sessions.CreateAsync(classroomId, req.Title);
        return CreatedAtAction(null, new { id = session.Id },
            new { session.Id, session.Title, session.Status, session.CreatedAt });
    }

    [HttpPost("api/sessions/{sessionId}/start")]
    public async Task<IActionResult> Start(string sessionId)
    {
        var userId   = HttpContext.Items["UserId"]   as string;
        var userName = HttpContext.Items["UserName"] as string;
        var role     = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return Forbid();

        var session = await _sessions.StartAsync(sessionId);
        if (session == null) return NotFound();

        var token      = _liveKit.GenerateToken(userId, userName!, session.RoomId!, canPublish: true);
        var liveKitUrl = _config["LiveKit:Url"]!;

        return Ok(new { token, roomId = session.RoomId, liveKitUrl });
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

        var token      = _liveKit.GenerateToken(userId, userName!, session.RoomId!, canPublish: true);
        var liveKitUrl = _config["LiveKit:Url"]!;

        return Ok(new { token, roomId = session.RoomId, liveKitUrl });
    }

    [HttpPost("api/sessions/{sessionId}/end")]
    public async Task<IActionResult> End(string sessionId)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return Forbid();

        await _sessions.EndAsync(sessionId);
        return NoContent();
    }

    private IConfiguration _config =>
        HttpContext.RequestServices.GetRequiredService<IConfiguration>();
}

public record CreateSessionRequest(string Title);
```

- [ ] **Step 7: Run all tests**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend
dotnet test EduPlatform.Api.Tests -v
```
Expected: All tests pass, `Failed: 0`

- [ ] **Step 8: Build final check**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend && dotnet build
```
Expected: `Build succeeded. 0 Warning(s) 0 Error(s)`

- [ ] **Step 9: Smoke-test by running the API**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT/backend/EduPlatform.Api
ASPNETCORE_ENVIRONMENT=Development dotnet run &
sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/login \
  -X POST -H "Content-Type: application/json" -d '{"email":"x","password":"x"}'
```
Expected: `401` (unauthorized, not 500 — proves the server started and routes are wired)

```bash
pkill -f "dotnet run"
```

- [ ] **Step 10: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git add backend/EduPlatform.Api/Services/ backend/EduPlatform.Api/Controllers/ backend/EduPlatform.Api.Tests/
git commit -m "feat: complete .NET 8 backend — sessions, LiveKit tokens, all controllers"
```

---

## Setup Checklist (Before First Run)

1. Create MongoDB Atlas cluster → get connection string → add to `appsettings.Development.json`
2. Generate a 32+ char random string → set as `Jwt:Secret` in `appsettings.Development.json`
3. Run `dotnet run` from `backend/EduPlatform.Api/` — indexes are created automatically on first connect
