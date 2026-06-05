# Teaching Platform — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a .NET 8 Web API with PostgreSQL (EF Core), Google OAuth token validation, JWT auth, and LiveKit token generation that powers the teaching platform.

**Architecture:** Single .NET 8 Web API project in `backend/TeachingPlatform.API/`. EF Core code-first migrations against a local PostgreSQL 14 database. Google ID tokens validated on the backend; own JWTs issued for subsequent API calls. LiveKit access tokens generated server-side and returned to the frontend.

**Tech Stack:** .NET 8, ASP.NET Core Web API, EF Core 8, Npgsql, Google.Apis.Auth, Microsoft.IdentityModel.JsonWebTokens, Swashbuckle

---

## File Map

```
backend/
  TeachingPlatform.API/
    TeachingPlatform.API.csproj
    Program.cs
    appsettings.json
    appsettings.Development.json
    Data/
      AppDbContext.cs
    Models/
      User.cs
      Classroom.cs
      ClassroomMember.cs
      Channel.cs
      Message.cs
      Document.cs
      Session.cs
    DTOs/
      AuthDtos.cs
      ClassroomDtos.cs
      ChannelDtos.cs
      SessionDtos.cs
    Services/
      JwtService.cs
      GoogleAuthService.cs
      LiveKitService.cs
    Controllers/
      AuthController.cs
      ClassroomsController.cs
      ChannelsController.cs
      SessionsController.cs
    Migrations/   ← EF Core generated, do not edit
```

---

## Prerequisites

- .NET 8 SDK: `brew install --cask dotnet` (or download from https://dotnet.microsoft.com/download)
- PostgreSQL 14 already installed via Homebrew
- Database running: `brew services start postgresql@14`

---

### Task 1: Project Scaffold & NuGet Packages

**Files:**
- Create: `backend/TeachingPlatform.API/TeachingPlatform.API.csproj`

- [ ] **Step 1: Create the .NET project**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
mkdir -p backend
cd backend
dotnet new webapi -n TeachingPlatform.API --no-openapi
cd TeachingPlatform.API
```

- [ ] **Step 2: Add NuGet packages**

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.0
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.0.0
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.0
dotnet add package Google.Apis.Auth --version 1.68.0
dotnet add package Swashbuckle.AspNetCore --version 6.5.0
dotnet add package Microsoft.IdentityModel.JsonWebTokens --version 7.5.0
```

- [ ] **Step 3: Verify restore**

```bash
dotnet restore
```
Expected: `Restore completed` with no errors.

- [ ] **Step 4: Create the PostgreSQL database**

```bash
createdb teaching_platform
```

- [ ] **Step 5: Commit**

```bash
cd /Users/harshavardhanan/Documents/CODING/LIVE_KIT
git init
git add backend/
git commit -m "chore: scaffold .NET 8 Web API project"
```

---

### Task 2: App Settings & Program.cs

**Files:**
- Create: `backend/TeachingPlatform.API/appsettings.json`
- Create: `backend/TeachingPlatform.API/appsettings.Development.json`
- Modify: `backend/TeachingPlatform.API/Program.cs`

- [ ] **Step 1: Write appsettings.json** (committed to repo — no secrets)

Replace the file content:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "Jwt": {
    "Secret": "",
    "Issuer": "TeachingPlatform",
    "Audience": "TeachingPlatformClient",
    "ExpiryHours": 24
  },
  "Google": {
    "ClientId": ""
  },
  "LiveKit": {
    "ApiKey": "",
    "ApiSecret": "",
    "Url": ""
  },
  "ConnectionStrings": {
    "DefaultConnection": ""
  }
}
```

- [ ] **Step 2: Write appsettings.Development.json** (gitignored — real secrets here)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=teaching_platform;Username=YOUR_MAC_USERNAME;Password="
  },
  "Jwt": {
    "Secret": "REPLACE_WITH_32_CHAR_RANDOM_STRING_USE_OPENSSL_RAND"
  },
  "Google": {
    "ClientId": "REPLACE_WITH_GOOGLE_CLIENT_ID"
  },
  "LiveKit": {
    "ApiKey": "YOUR_LIVEKIT_API_KEY",
    "ApiSecret": "YOUR_LIVEKIT_API_SECRET",
    "Url": "wss://your-project.livekit.cloud"
  }
}
```

Generate a JWT secret: `openssl rand -base64 32`

- [ ] **Step 3: Add appsettings.Development.json to .gitignore**

Create `backend/.gitignore`:
```
obj/
bin/
*.user
appsettings.Development.json
```

- [ ] **Step 4: Write Program.cs**

Replace the entire file:
```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using TeachingPlatform.API.Data;
using TeachingPlatform.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwtSecret = builder.Configuration["Jwt:Secret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddSingleton<JwtService>();
builder.Services.AddSingleton<GoogleAuthService>();
builder.Services.AddSingleton<LiveKitService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();
app.UseSwagger();
app.UseSwaggerUI();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

- [ ] **Step 5: Verify it compiles (will fail on missing namespaces — expected at this stage)**

```bash
dotnet build
```
Expected: errors about missing `AppDbContext`, `JwtService`, etc. — that is fine. We fix these in upcoming tasks.

---

### Task 3: Database Models

**Files:**
- Create: `backend/TeachingPlatform.API/Models/User.cs`
- Create: `backend/TeachingPlatform.API/Models/Classroom.cs`
- Create: `backend/TeachingPlatform.API/Models/ClassroomMember.cs`
- Create: `backend/TeachingPlatform.API/Models/Channel.cs`
- Create: `backend/TeachingPlatform.API/Models/Message.cs`
- Create: `backend/TeachingPlatform.API/Models/Document.cs`
- Create: `backend/TeachingPlatform.API/Models/Session.cs`

- [ ] **Step 1: Create Models/User.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string GoogleId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Role { get; set; }          // "teacher" | "student" | null (not chosen yet)
    public string? StudentId { get; set; }     // STU-XXXXX, only for students
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Classroom> OwnedClassrooms { get; set; } = [];
    public ICollection<ClassroomMember> Memberships { get; set; } = [];
}
```

- [ ] **Step 2: Create Models/Classroom.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class Classroom
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid TeacherId { get; set; }
    public string InviteCode { get; set; } = string.Empty;  // unique 6-char
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Teacher { get; set; } = null!;
    public ICollection<ClassroomMember> Members { get; set; } = [];
    public ICollection<Channel> Channels { get; set; } = [];
    public ICollection<Session> Sessions { get; set; } = [];
}
```

- [ ] **Step 3: Create Models/ClassroomMember.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class ClassroomMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassroomId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Classroom Classroom { get; set; } = null!;
    public User User { get; set; } = null!;
}
```

- [ ] **Step 4: Create Models/Channel.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class Channel
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassroomId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "general";  // "announcement" | "general" | "resource"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Classroom Classroom { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
}
```

- [ ] **Step 5: Create Models/Message.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChannelId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Channel Channel { get; set; } = null!;
    public User Sender { get; set; } = null!;
}
```

- [ ] **Step 6: Create Models/Document.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChannelId { get; set; }
    public Guid UploadedBy { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Channel Channel { get; set; } = null!;
    public User Uploader { get; set; } = null!;
}
```

- [ ] **Step 7: Create Models/Session.cs**

```csharp
namespace TeachingPlatform.API.Models;

public class Session
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClassroomId { get; set; }
    public string? RoomId { get; set; }    // LiveKit room name
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "waiting";  // "waiting" | "live" | "ended"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Classroom Classroom { get; set; } = null!;
}
```

- [ ] **Step 8: Commit**

```bash
git add backend/
git commit -m "feat: add EF Core domain models"
```

---

### Task 4: AppDbContext

**Files:**
- Create: `backend/TeachingPlatform.API/Data/AppDbContext.cs`

- [ ] **Step 1: Write AppDbContext.cs**

```csharp
using Microsoft.EntityFrameworkCore;
using TeachingPlatform.API.Models;

namespace TeachingPlatform.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Classroom> Classrooms => Set<Classroom>();
    public DbSet<ClassroomMember> ClassroomMembers => Set<ClassroomMember>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Session> Sessions => Set<Session>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.GoogleId).IsUnique();
            e.HasIndex(u => u.StudentId).IsUnique();
        });

        modelBuilder.Entity<Classroom>(e =>
        {
            e.HasIndex(c => c.InviteCode).IsUnique();
            e.HasOne(c => c.Teacher)
             .WithMany(u => u.OwnedClassrooms)
             .HasForeignKey(c => c.TeacherId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ClassroomMember>(e =>
        {
            e.HasIndex(m => new { m.ClassroomId, m.UserId }).IsUnique();
            e.HasOne(m => m.User)
             .WithMany(u => u.Memberships)
             .HasForeignKey(m => m.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Message>(e =>
        {
            e.HasOne(m => m.Sender)
             .WithMany()
             .HasForeignKey(m => m.SenderId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Document>(e =>
        {
            e.HasOne(d => d.Uploader)
             .WithMany()
             .HasForeignKey(d => d.UploadedBy)
             .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
```

- [ ] **Step 2: Verify build**

```bash
cd backend/TeachingPlatform.API
dotnet build
```
Expected: errors only for missing `Services/` files (JwtService, GoogleAuthService, LiveKitService). Models and DbContext should compile.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add AppDbContext with EF Core configuration"
```

---

### Task 5: Services — JWT, Google Auth, LiveKit

**Files:**
- Create: `backend/TeachingPlatform.API/Services/JwtService.cs`
- Create: `backend/TeachingPlatform.API/Services/GoogleAuthService.cs`
- Create: `backend/TeachingPlatform.API/Services/LiveKitService.cs`

- [ ] **Step 1: Write Services/JwtService.cs**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TeachingPlatform.API.Services;

public class JwtService(IConfiguration config)
{
    private readonly string _secret = config["Jwt:Secret"]!;
    private readonly string _issuer = config["Jwt:Issuer"]!;
    private readonly string _audience = config["Jwt:Audience"]!;
    private readonly int _expiryHours = int.Parse(config["Jwt:ExpiryHours"] ?? "24");

    public string GenerateToken(string userId, string email, string role)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_expiryHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 2: Write Services/GoogleAuthService.cs**

```csharp
using Google.Apis.Auth;

namespace TeachingPlatform.API.Services;

public class GoogleAuthService(IConfiguration config)
{
    private readonly string _clientId = config["Google:ClientId"]!;

    public async Task<GoogleJsonWebSignature.Payload> ValidateIdTokenAsync(string idToken)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = [_clientId]
        };
        return await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
    }
}
```

- [ ] **Step 3: Write Services/LiveKitService.cs**

LiveKit tokens are standard JWTs signed with HMAC-SHA256. The `video` claim is a JSON object embedded as a claim value.

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace TeachingPlatform.API.Services;

public class LiveKitService(IConfiguration config)
{
    private readonly string _apiKey = config["LiveKit:ApiKey"]!;
    private readonly string _apiSecret = config["LiveKit:ApiSecret"]!;

    public string GenerateToken(
        string identity,
        string roomName,
        bool canPublish = true,
        bool canSubscribe = true)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_apiSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var videoGrant = JsonSerializer.Serialize(new
        {
            room = roomName,
            roomJoin = true,
            canPublish,
            canSubscribe,
            canPublishData = true,
        });

        var claims = new[]
        {
            new Claim("sub", identity),
            new Claim("video", videoGrant),
        };

        var token = new JwtSecurityToken(
            issuer: _apiKey,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
```

- [ ] **Step 4: Verify build compiles cleanly**

```bash
cd backend/TeachingPlatform.API
dotnet build
```
Expected: `Build succeeded` with 0 errors (controllers not added yet so no routing issues).

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add JWT, Google auth, and LiveKit token services"
```

---

### Task 6: DTOs

**Files:**
- Create: `backend/TeachingPlatform.API/DTOs/AuthDtos.cs`
- Create: `backend/TeachingPlatform.API/DTOs/ClassroomDtos.cs`
- Create: `backend/TeachingPlatform.API/DTOs/ChannelDtos.cs`
- Create: `backend/TeachingPlatform.API/DTOs/SessionDtos.cs`

- [ ] **Step 1: Write DTOs/AuthDtos.cs**

```csharp
namespace TeachingPlatform.API.DTOs;

public record GoogleLoginRequest(string IdToken);
public record RoleRequest(string Role);  // "teacher" | "student"

public record AuthResponse(
    string Token,
    string UserId,
    string Email,
    string Name,
    string? Role,
    string? StudentId,
    string? AvatarUrl,
    bool NeedsRoleSelection
);
```

- [ ] **Step 2: Write DTOs/ClassroomDtos.cs**

```csharp
namespace TeachingPlatform.API.DTOs;

public record CreateClassroomRequest(string Name, string? Description);
public record JoinClassroomRequest(string InviteCode);
public record AddMemberRequest(string StudentId);

public record ClassroomResponse(
    Guid Id,
    string Name,
    string? Description,
    string InviteCode,
    MemberResponse Teacher,
    DateTime CreatedAt
);

public record MemberResponse(
    Guid UserId,
    string Name,
    string Email,
    string? StudentId,
    string? AvatarUrl,
    string Role
);
```

- [ ] **Step 3: Write DTOs/ChannelDtos.cs**

```csharp
namespace TeachingPlatform.API.DTOs;

public record CreateChannelRequest(string Name, string Type);
public record SendMessageRequest(string Content);
public record SaveDocumentRequest(string FileName, string FileUrl, long FileSize);

public record ChannelResponse(Guid Id, string Name, string Type, DateTime CreatedAt);

public record MessageResponse(
    Guid Id,
    string Content,
    DateTime CreatedAt,
    MemberResponse Sender
);

public record DocumentResponse(
    Guid Id,
    string FileName,
    string FileUrl,
    long FileSize,
    DateTime CreatedAt,
    MemberResponse UploadedBy
);
```

- [ ] **Step 4: Write DTOs/SessionDtos.cs**

```csharp
namespace TeachingPlatform.API.DTOs;

public record CreateSessionRequest(string Title);

public record SessionResponse(
    Guid Id,
    string Title,
    string Status,
    string? RoomId,
    DateTime CreatedAt
);

public record TokenResponse(string Token, string RoomId, string LiveKitUrl);
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add request/response DTOs"
```

---

### Task 7: EF Core Migrations

**Files:**
- `backend/TeachingPlatform.API/Migrations/` (generated)

- [ ] **Step 1: Install EF Core global tool (once)**

```bash
dotnet tool install --global dotnet-ef
```

- [ ] **Step 2: Create initial migration**

```bash
cd backend/TeachingPlatform.API
dotnet ef migrations add InitialCreate
```
Expected: `Migrations/` folder created with `InitialCreate.cs` and `AppDbContextModelSnapshot.cs`.

- [ ] **Step 3: Apply migration**

```bash
dotnet ef database update
```
Expected: `Done` — all tables created in `teaching_platform` database.

- [ ] **Step 4: Verify tables**

```bash
psql teaching_platform -c "\dt"
```
Expected: `Users`, `Classrooms`, `ClassroomMembers`, `Channels`, `Messages`, `Documents`, `Sessions` tables listed.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add initial EF Core migration"
```

---

### Task 8: Auth Controller

**Files:**
- Create: `backend/TeachingPlatform.API/Controllers/AuthController.cs`

- [ ] **Step 1: Write AuthController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TeachingPlatform.API.Data;
using TeachingPlatform.API.DTOs;
using TeachingPlatform.API.Models;
using TeachingPlatform.API.Services;

namespace TeachingPlatform.API.Controllers;

[ApiController]
[Route("auth")]
public class AuthController(
    AppDbContext db,
    JwtService jwtService,
    GoogleAuthService googleAuth) : ControllerBase
{
    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleLoginRequest req)
    {
        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await googleAuth.ValidateIdTokenAsync(req.IdToken);
        }
        catch
        {
            return Unauthorized(new { error = "Invalid Google token" });
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == payload.Subject);
        if (user is null)
        {
            user = new User
            {
                GoogleId = payload.Subject,
                Email = payload.Email,
                Name = payload.Name,
                AvatarUrl = payload.Picture,
            };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        var role = user.Role ?? "pending";
        var token = jwtService.GenerateToken(user.Id.ToString(), user.Email, role);

        return Ok(new AuthResponse(
            Token: token,
            UserId: user.Id.ToString(),
            Email: user.Email,
            Name: user.Name,
            Role: user.Role,
            StudentId: user.StudentId,
            AvatarUrl: user.AvatarUrl,
            NeedsRoleSelection: user.Role is null
        ));
    }

    [HttpPost("role")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> SetRole([FromBody] RoleRequest req)
    {
        if (req.Role is not ("teacher" or "student"))
            return BadRequest(new { error = "Role must be 'teacher' or 'student'" });

        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();
        if (user.Role is not null) return BadRequest(new { error = "Role already set" });

        user.Role = req.Role;
        if (req.Role == "student")
        {
            string studentId;
            do
            {
                studentId = "STU-" + Random.Shared.Next(10000, 99999);
            } while (await db.Users.AnyAsync(u => u.StudentId == studentId));

            user.StudentId = studentId;
        }

        await db.SaveChangesAsync();

        var token = jwtService.GenerateToken(user.Id.ToString(), user.Email, user.Role);
        return Ok(new AuthResponse(
            Token: token,
            UserId: user.Id.ToString(),
            Email: user.Email,
            Name: user.Name,
            Role: user.Role,
            StudentId: user.StudentId,
            AvatarUrl: user.AvatarUrl,
            NeedsRoleSelection: false
        ));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthResponse>> Me()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        var token = jwtService.GenerateToken(user.Id.ToString(), user.Email, user.Role ?? "pending");
        return Ok(new AuthResponse(
            Token: token,
            UserId: user.Id.ToString(),
            Email: user.Email,
            Name: user.Name,
            Role: user.Role,
            StudentId: user.StudentId,
            AvatarUrl: user.AvatarUrl,
            NeedsRoleSelection: user.Role is null
        ));
    }
}
```

- [ ] **Step 2: Build and verify**

```bash
cd backend/TeachingPlatform.API
dotnet build
```
Expected: `Build succeeded`.

- [ ] **Step 3: Start the server and test Google login endpoint exists**

```bash
dotnet run &
curl -s http://localhost:5000/auth/google -X POST -H "Content-Type: application/json" \
  -d '{"idToken":"invalid"}' | python3 -m json.tool
```
Expected: `{"error":"Invalid Google token"}` with HTTP 401.

- [ ] **Step 4: Stop server and commit**

```bash
kill %1
git add backend/
git commit -m "feat: add auth controller (Google login + role selection)"
```

---

### Task 9: Classrooms Controller

**Files:**
- Create: `backend/TeachingPlatform.API/Controllers/ClassroomsController.cs`

- [ ] **Step 1: Write ClassroomsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TeachingPlatform.API.Data;
using TeachingPlatform.API.DTOs;
using TeachingPlatform.API.Models;

namespace TeachingPlatform.API.Controllers;

[ApiController]
[Route("classrooms")]
[Authorize]
public class ClassroomsController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static MemberResponse ToMemberResponse(User u) =>
        new(u.Id, u.Name, u.Email, u.StudentId, u.AvatarUrl, u.Role ?? "student");

    private static string GenerateInviteCode() =>
        string.Concat(Enumerable.Range(0, 6)
            .Select(_ => "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Random.Shared.Next(36)]));

    [HttpGet]
    public async Task<ActionResult<List<ClassroomResponse>>> GetClassrooms()
    {
        var userId = CurrentUserId;
        var role = User.FindFirstValue(ClaimTypes.Role);

        List<Classroom> classrooms;
        if (role == "teacher")
        {
            classrooms = await db.Classrooms
                .Include(c => c.Teacher)
                .Where(c => c.TeacherId == userId)
                .ToListAsync();
        }
        else
        {
            classrooms = await db.ClassroomMembers
                .Include(m => m.Classroom).ThenInclude(c => c.Teacher)
                .Where(m => m.UserId == userId)
                .Select(m => m.Classroom)
                .ToListAsync();
        }

        return Ok(classrooms.Select(c => new ClassroomResponse(
            c.Id, c.Name, c.Description, c.InviteCode,
            ToMemberResponse(c.Teacher), c.CreatedAt)));
    }

    [HttpPost]
    public async Task<ActionResult<ClassroomResponse>> CreateClassroom(
        [FromBody] CreateClassroomRequest req)
    {
        if (User.FindFirstValue(ClaimTypes.Role) != "teacher")
            return Forbid();

        var userId = CurrentUserId;
        string inviteCode;
        do { inviteCode = GenerateInviteCode(); }
        while (await db.Classrooms.AnyAsync(c => c.InviteCode == inviteCode));

        var classroom = new Classroom
        {
            Name = req.Name,
            Description = req.Description,
            TeacherId = userId,
            InviteCode = inviteCode,
        };
        db.Classrooms.Add(classroom);

        // Auto-create 3 default channels
        db.Channels.AddRange(
            new Channel { ClassroomId = classroom.Id, Name = "general", Type = "general" },
            new Channel { ClassroomId = classroom.Id, Name = "announcements", Type = "announcement" },
            new Channel { ClassroomId = classroom.Id, Name = "resources", Type = "resource" }
        );

        await db.SaveChangesAsync();

        var teacher = (await db.Users.FindAsync(userId))!;
        return CreatedAtAction(nameof(GetClassroom), new { id = classroom.Id },
            new ClassroomResponse(classroom.Id, classroom.Name, classroom.Description,
                classroom.InviteCode, ToMemberResponse(teacher), classroom.CreatedAt));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetClassroom(Guid id)
    {
        var classroom = await db.Classrooms
            .Include(c => c.Teacher)
            .Include(c => c.Members).ThenInclude(m => m.User)
            .Include(c => c.Channels)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (classroom is null) return NotFound();

        var userId = CurrentUserId;
        var isTeacher = classroom.TeacherId == userId;
        var isMember = classroom.Members.Any(m => m.UserId == userId);
        if (!isTeacher && !isMember) return Forbid();

        return Ok(new
        {
            classroom.Id,
            classroom.Name,
            classroom.Description,
            classroom.InviteCode,
            Teacher = ToMemberResponse(classroom.Teacher),
            classroom.CreatedAt,
            Channels = classroom.Channels.OrderBy(c => c.CreatedAt)
                .Select(c => new ChannelResponse(c.Id, c.Name, c.Type, c.CreatedAt)),
            Members = classroom.Members.Select(m => ToMemberResponse(m.User)),
        });
    }

    [HttpPost("join")]
    public async Task<ActionResult> JoinClassroom([FromBody] JoinClassroomRequest req)
    {
        var userId = CurrentUserId;
        var classroom = await db.Classrooms
            .FirstOrDefaultAsync(c => c.InviteCode == req.InviteCode.ToUpper());

        if (classroom is null) return NotFound(new { error = "Invalid invite code" });

        var alreadyMember = await db.ClassroomMembers
            .AnyAsync(m => m.ClassroomId == classroom.Id && m.UserId == userId);
        if (alreadyMember) return Ok(new { classroomId = classroom.Id });

        db.ClassroomMembers.Add(new ClassroomMember
        {
            ClassroomId = classroom.Id,
            UserId = userId,
        });
        await db.SaveChangesAsync();

        return Ok(new { classroomId = classroom.Id });
    }

    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult> AddMember(Guid id, [FromBody] AddMemberRequest req)
    {
        var classroom = await db.Classrooms.FindAsync(id);
        if (classroom is null) return NotFound();
        if (classroom.TeacherId != CurrentUserId) return Forbid();

        var student = await db.Users.FirstOrDefaultAsync(u => u.StudentId == req.StudentId);
        if (student is null) return NotFound(new { error = "Student not found" });

        var exists = await db.ClassroomMembers
            .AnyAsync(m => m.ClassroomId == id && m.UserId == student.Id);
        if (exists) return Conflict(new { error = "Already a member" });

        db.ClassroomMembers.Add(new ClassroomMember { ClassroomId = id, UserId = student.Id });
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult> RemoveMember(Guid id, Guid userId)
    {
        var classroom = await db.Classrooms.FindAsync(id);
        if (classroom is null) return NotFound();
        if (classroom.TeacherId != CurrentUserId) return Forbid();

        var member = await db.ClassroomMembers
            .FirstOrDefaultAsync(m => m.ClassroomId == id && m.UserId == userId);
        if (member is null) return NotFound();

        db.ClassroomMembers.Remove(member);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend/TeachingPlatform.API
dotnet build
```
Expected: `Build succeeded`.

- [ ] **Step 3: Commit**

```bash
git add backend/
git commit -m "feat: add classrooms controller (CRUD, join, member management)"
```

---

### Task 10: Channels & Sessions Controllers

**Files:**
- Create: `backend/TeachingPlatform.API/Controllers/ChannelsController.cs`
- Create: `backend/TeachingPlatform.API/Controllers/SessionsController.cs`

- [ ] **Step 1: Write ChannelsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TeachingPlatform.API.Data;
using TeachingPlatform.API.DTOs;
using TeachingPlatform.API.Models;

namespace TeachingPlatform.API.Controllers;

[ApiController]
[Authorize]
public class ChannelsController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static MemberResponse ToMemberResponse(User u) =>
        new(u.Id, u.Name, u.Email, u.StudentId, u.AvatarUrl, u.Role ?? "student");

    private async Task<bool> CanAccessClassroom(Guid classroomId)
    {
        var userId = CurrentUserId;
        var classroom = await db.Classrooms
            .Include(c => c.Members)
            .FirstOrDefaultAsync(c => c.Id == classroomId);
        if (classroom is null) return false;
        return classroom.TeacherId == userId || classroom.Members.Any(m => m.UserId == userId);
    }

    [HttpGet("classrooms/{classroomId:guid}/channels")]
    public async Task<ActionResult<List<ChannelResponse>>> GetChannels(Guid classroomId)
    {
        if (!await CanAccessClassroom(classroomId)) return Forbid();

        var channels = await db.Channels
            .Where(c => c.ClassroomId == classroomId)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new ChannelResponse(c.Id, c.Name, c.Type, c.CreatedAt))
            .ToListAsync();

        return Ok(channels);
    }

    [HttpPost("classrooms/{classroomId:guid}/channels")]
    public async Task<ActionResult<ChannelResponse>> CreateChannel(
        Guid classroomId, [FromBody] CreateChannelRequest req)
    {
        var classroom = await db.Classrooms.FindAsync(classroomId);
        if (classroom is null) return NotFound();
        if (classroom.TeacherId != CurrentUserId) return Forbid();

        var channel = new Channel
        {
            ClassroomId = classroomId,
            Name = req.Name,
            Type = req.Type,
        };
        db.Channels.Add(channel);
        await db.SaveChangesAsync();

        return CreatedAtAction(null, new ChannelResponse(
            channel.Id, channel.Name, channel.Type, channel.CreatedAt));
    }

    [HttpGet("channels/{channelId:guid}/messages")]
    public async Task<ActionResult<List<MessageResponse>>> GetMessages(
        Guid channelId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var channel = await db.Channels.FindAsync(channelId);
        if (channel is null) return NotFound();
        if (!await CanAccessClassroom(channel.ClassroomId)) return Forbid();

        var messages = await db.Messages
            .Include(m => m.Sender)
            .Where(m => m.ChannelId == channelId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(messages
            .OrderBy(m => m.CreatedAt)
            .Select(m => new MessageResponse(m.Id, m.Content, m.CreatedAt,
                ToMemberResponse(m.Sender))));
    }

    [HttpPost("channels/{channelId:guid}/messages")]
    public async Task<ActionResult<MessageResponse>> SendMessage(
        Guid channelId, [FromBody] SendMessageRequest req)
    {
        var channel = await db.Channels.FindAsync(channelId);
        if (channel is null) return NotFound();
        if (!await CanAccessClassroom(channel.ClassroomId)) return Forbid();

        // Announcement channels: only teacher can post
        if (channel.Type == "announcement")
        {
            var classroom = await db.Classrooms.FindAsync(channel.ClassroomId);
            if (classroom!.TeacherId != CurrentUserId) return Forbid();
        }

        var userId = CurrentUserId;
        var message = new Message
        {
            ChannelId = channelId,
            SenderId = userId,
            Content = req.Content,
        };
        db.Messages.Add(message);
        await db.SaveChangesAsync();

        var sender = (await db.Users.FindAsync(userId))!;
        return Ok(new MessageResponse(message.Id, message.Content, message.CreatedAt,
            ToMemberResponse(sender)));
    }

    [HttpGet("channels/{channelId:guid}/documents")]
    public async Task<ActionResult<List<DocumentResponse>>> GetDocuments(Guid channelId)
    {
        var channel = await db.Channels.FindAsync(channelId);
        if (channel is null) return NotFound();
        if (!await CanAccessClassroom(channel.ClassroomId)) return Forbid();

        var docs = await db.Documents
            .Include(d => d.Uploader)
            .Where(d => d.ChannelId == channelId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return Ok(docs.Select(d => new DocumentResponse(
            d.Id, d.FileName, d.FileUrl, d.FileSize, d.CreatedAt,
            ToMemberResponse(d.Uploader))));
    }

    [HttpPost("channels/{channelId:guid}/documents")]
    public async Task<ActionResult<DocumentResponse>> SaveDocument(
        Guid channelId, [FromBody] SaveDocumentRequest req)
    {
        var channel = await db.Channels.FindAsync(channelId);
        if (channel is null) return NotFound();
        if (!await CanAccessClassroom(channel.ClassroomId)) return Forbid();

        var userId = CurrentUserId;
        var doc = new Document
        {
            ChannelId = channelId,
            UploadedBy = userId,
            FileName = req.FileName,
            FileUrl = req.FileUrl,
            FileSize = req.FileSize,
        };
        db.Documents.Add(doc);
        await db.SaveChangesAsync();

        var uploader = (await db.Users.FindAsync(userId))!;
        return Ok(new DocumentResponse(doc.Id, doc.FileName, doc.FileUrl, doc.FileSize,
            doc.CreatedAt, ToMemberResponse(uploader)));
    }
}
```

- [ ] **Step 2: Write SessionsController.cs**

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using TeachingPlatform.API.Data;
using TeachingPlatform.API.DTOs;
using TeachingPlatform.API.Models;
using TeachingPlatform.API.Services;

namespace TeachingPlatform.API.Controllers;

[ApiController]
[Authorize]
public class SessionsController(AppDbContext db, LiveKitService liveKit, IConfiguration config)
    : ControllerBase
{
    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private readonly string _livekitUrl = config["LiveKit:Url"]!;

    [HttpGet("classrooms/{classroomId:guid}/sessions")]
    public async Task<ActionResult<List<SessionResponse>>> GetSessions(Guid classroomId)
    {
        var sessions = await db.Sessions
            .Where(s => s.ClassroomId == classroomId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SessionResponse(s.Id, s.Title, s.Status, s.RoomId, s.CreatedAt))
            .ToListAsync();

        return Ok(sessions);
    }

    [HttpPost("classrooms/{classroomId:guid}/sessions")]
    public async Task<ActionResult<SessionResponse>> CreateSession(
        Guid classroomId, [FromBody] CreateSessionRequest req)
    {
        var classroom = await db.Classrooms.FindAsync(classroomId);
        if (classroom is null) return NotFound();
        if (classroom.TeacherId != CurrentUserId) return Forbid();

        var session = new Session
        {
            ClassroomId = classroomId,
            Title = req.Title,
            Status = "waiting",
        };
        db.Sessions.Add(session);
        await db.SaveChangesAsync();

        return CreatedAtAction(null,
            new SessionResponse(session.Id, session.Title, session.Status, session.RoomId,
                session.CreatedAt));
    }

    [HttpPost("sessions/{sessionId:guid}/start")]
    public async Task<ActionResult<TokenResponse>> StartSession(Guid sessionId)
    {
        var session = await db.Sessions
            .Include(s => s.Classroom)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return NotFound();
        if (session.Classroom.TeacherId != CurrentUserId) return Forbid();

        session.RoomId = $"classroom-{session.ClassroomId}-{sessionId}";
        session.Status = "live";
        await db.SaveChangesAsync();

        var user = (await db.Users.FindAsync(CurrentUserId))!;
        var token = liveKit.GenerateToken(user.Name, session.RoomId, canPublish: true);

        return Ok(new TokenResponse(token, session.RoomId, _livekitUrl));
    }

    [HttpPost("sessions/{sessionId:guid}/join")]
    public async Task<ActionResult<TokenResponse>> JoinSession(Guid sessionId)
    {
        var session = await db.Sessions
            .Include(s => s.Classroom).ThenInclude(c => c.Members)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return NotFound();
        if (session.Status != "live") return BadRequest(new { error = "Session is not live" });

        var userId = CurrentUserId;
        var isTeacher = session.Classroom.TeacherId == userId;
        var isMember = session.Classroom.Members.Any(m => m.UserId == userId);
        if (!isTeacher && !isMember) return Forbid();

        var user = (await db.Users.FindAsync(userId))!;
        var token = liveKit.GenerateToken(user.Name, session.RoomId!, canPublish: true);

        return Ok(new TokenResponse(token, session.RoomId!, _livekitUrl));
    }

    [HttpPost("sessions/{sessionId:guid}/end")]
    public async Task<ActionResult> EndSession(Guid sessionId)
    {
        var session = await db.Sessions
            .Include(s => s.Classroom)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session is null) return NotFound();
        if (session.Classroom.TeacherId != CurrentUserId) return Forbid();

        session.Status = "ended";
        await db.SaveChangesAsync();
        return NoContent();
    }
}
```

- [ ] **Step 3: Final build check**

```bash
cd backend/TeachingPlatform.API
dotnet build
```
Expected: `Build succeeded` with 0 errors.

- [ ] **Step 4: Run and smoke test**

```bash
dotnet run &
# Check Swagger is reachable
curl -s http://localhost:5000/swagger/index.html | grep -c "swagger" && echo "Swagger OK"
kill %1
```

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "feat: add channels and sessions controllers — backend complete"
```

---

## Backend Complete ✓

The backend exposes:
- `POST /auth/google` — login/upsert
- `POST /auth/role` — one-time role selection
- `GET /auth/me` — current user
- `GET/POST /classrooms` — list/create
- `POST /classrooms/join` — join by invite code
- `GET /classrooms/{id}` — detail with channels + members
- `POST /classrooms/{id}/members` — add by student ID
- `DELETE /classrooms/{id}/members/{userId}` — remove
- `GET/POST /classrooms/{id}/channels` — list/create channels
- `GET/POST /channels/{id}/messages` — messages
- `GET/POST /channels/{id}/documents` — documents
- `GET/POST /classrooms/{id}/sessions` — sessions
- `POST /sessions/{id}/start` — teacher starts → LiveKit token
- `POST /sessions/{id}/join` — student joins → LiveKit token
- `POST /sessions/{id}/end` — end session

Continue with **`2026-05-15-teaching-platform-frontend.md`**.
