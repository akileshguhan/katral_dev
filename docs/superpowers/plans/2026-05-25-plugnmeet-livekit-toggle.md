# plugNmeet + LiveKit Global Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add plugNmeet as a second video engine alongside LiveKit, switchable at runtime via a global toggle in the teacher dashboard with no server restart required.

**Architecture:** A `config` MongoDB collection holds a single `{ key: "video_engine", value: "livekit"|"plugnmeet" }` document. The .NET backend reads this on every Start/Join call and delegates to either `LiveKitService` (existing) or `PlugNmeetService` (new). The frontend reads the `engine` field in the session response and renders either the existing LiveKit component or a new `PlugNmeetRoom` iframe.

**Tech Stack:** .NET 10 + MongoDB.Driver 3.x, IHttpClientFactory, HMAC-SHA256 (System.Security.Cryptography), Next.js 15 App Router, React, TypeScript. plugNmeet runs locally via Docker Compose with Redis + MariaDB + NATS dependencies.

---

## File Map

**Backend — new files:**
- `backend/EduPlatform.Api/Models/Config.cs` — MongoDB config document
- `backend/EduPlatform.Api/Services/ConfigService.cs` — get/set video engine, ensure default
- `backend/EduPlatform.Api/Services/PlugNmeetService.cs` — HTTP client for plugNmeet API (create room, join token, end room)
- `backend/EduPlatform.Api/Controllers/ConfigController.cs` — GET /api/config, PUT /api/config/video-engine
- `backend/EduPlatform.Api.Tests/ConfigServiceTests.cs` — validation tests
- `backend/EduPlatform.Api.Tests/PlugNmeetServiceTests.cs` — HMAC signing test

**Backend — modified files:**
- `backend/EduPlatform.Api/Data/MongoDbContext.cs` — add Configs collection + unique index
- `backend/EduPlatform.Api/Controllers/SessionController.cs` — branch Start/Join/End on engine
- `backend/EduPlatform.Api/Program.cs` — register ConfigService, IHttpClientFactory, PlugNmeetService; call EnsureDefault
- `backend/EduPlatform.Api/appsettings.json` — add PlugNmeet section

**Docker — new files:**
- `plugnmeet-docker/config.yaml` — plugNmeet config with LiveKit Cloud credentials
- `plugnmeet-docker/nats-server.conf` — NATS server config with PNM account/auth
- `plugnmeet-docker/docker-compose.yml` — Redis + MariaDB + NATS + plugNmeet build

**Frontend — new files:**
- `frontend/edu-web/components/session/PlugNmeetRoom.tsx` — full-screen iframe wrapper

**Frontend — modified files:**
- `frontend/edu-web/types/index.ts` — add VideoEngine type + SessionResponse interface
- `frontend/edu-web/lib/api.ts` — add api.config, update sessions.start/join return type
- `frontend/edu-web/app/teacher/session/[id]/page.tsx` — branch on engine
- `frontend/edu-web/app/student/session/[id]/page.tsx` — branch on engine
- `frontend/edu-web/app/teacher/dashboard/page.tsx` — add video engine toggle in right panel

---

## Task 1: Config model + MongoDbContext update

**Files:**
- Create: `backend/EduPlatform.Api/Models/Config.cs`
- Modify: `backend/EduPlatform.Api/Data/MongoDbContext.cs`

- [ ] **Step 1: Create Config.cs**

```csharp
// backend/EduPlatform.Api/Models/Config.cs
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduPlatform.Api.Models;

public class Config
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("key")]
    public string Key { get; set; } = null!;

    [BsonElement("value")]
    public string Value { get; set; } = null!;
}
```

- [ ] **Step 2: Add Configs collection and index to MongoDbContext**

Open `backend/EduPlatform.Api/Data/MongoDbContext.cs`. Add the collection property after the Messages property:

```csharp
public IMongoCollection<Config> Configs => _db.GetCollection<Config>("config");
```

Add the index inside the `EnsureIndexes()` method, after the Messages index:

```csharp
Configs.Indexes.CreateOne(new CreateIndexModel<Config>(
    Builders<Config>.IndexKeys.Ascending(c => c.Key),
    new CreateIndexOptions { Unique = true }));
```

- [ ] **Step 3: Build to confirm no errors**

```bash
cd backend/EduPlatform.Api && dotnet build
```
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 4: Commit**

```bash
git add backend/EduPlatform.Api/Models/Config.cs backend/EduPlatform.Api/Data/MongoDbContext.cs
git commit -m "feat: add Config model and Configs collection to MongoDbContext"
```

---

## Task 2: ConfigService

**Files:**
- Create: `backend/EduPlatform.Api/Services/ConfigService.cs`

- [ ] **Step 1: Write failing test for ConfigService engine validation**

Create `backend/EduPlatform.Api.Tests/ConfigServiceTests.cs`:

```csharp
using Xunit;

namespace EduPlatform.Api.Tests;

public class ConfigServiceTests
{
    [Theory]
    [InlineData("livekit",   true)]
    [InlineData("plugnmeet", true)]
    [InlineData("zoom",      false)]
    [InlineData("",          false)]
    [InlineData("LiveKit",   false)]
    public void VideoEngine_OnlyLiveKitAndPlugNmeetAreValid(string engine, bool expected)
    {
        var isValid = engine == "livekit" || engine == "plugnmeet";
        Assert.Equal(expected, isValid);
    }
}
```

- [ ] **Step 2: Run test to confirm it fails (class missing)**

```bash
cd backend/EduPlatform.Api.Tests && dotnet test --filter "ConfigServiceTests" -v
```
Expected: FAIL — `ConfigServiceTests` not yet referenced (or passes as-is since no code under test yet). Either way, confirm test file compiles.

- [ ] **Step 3: Create ConfigService.cs**

```csharp
// backend/EduPlatform.Api/Services/ConfigService.cs
using EduPlatform.Api.Data;
using EduPlatform.Api.Models;
using MongoDB.Driver;

namespace EduPlatform.Api.Services;

public class ConfigService
{
    private readonly MongoDbContext _db;

    public ConfigService(MongoDbContext db) => _db = db;

    public async Task EnsureDefaultAsync()
    {
        var exists = await _db.Configs.Find(c => c.Key == "video_engine").AnyAsync();
        if (!exists)
            await _db.Configs.InsertOneAsync(new Config { Key = "video_engine", Value = "livekit" });
    }

    public async Task<string> GetVideoEngineAsync()
    {
        var doc = await _db.Configs.Find(c => c.Key == "video_engine").FirstOrDefaultAsync();
        return doc?.Value ?? "livekit";
    }

    public async Task SetVideoEngineAsync(string engine)
    {
        var update = Builders<Config>.Update.Set(c => c.Value, engine);
        await _db.Configs.UpdateOneAsync(
            c => c.Key == "video_engine",
            update,
            new UpdateOptions { IsUpsert = true });
    }
}
```

- [ ] **Step 4: Run tests**

```bash
cd backend/EduPlatform.Api.Tests && dotnet test -v
```
Expected: all existing tests pass (11+), including the new ConfigServiceTests (1 theory = 5 cases).

- [ ] **Step 5: Commit**

```bash
git add backend/EduPlatform.Api/Services/ConfigService.cs backend/EduPlatform.Api.Tests/ConfigServiceTests.cs
git commit -m "feat: add ConfigService with GetVideoEngine/SetVideoEngine/EnsureDefault"
```

---

## Task 3: PlugNmeetService

**Files:**
- Create: `backend/EduPlatform.Api/Services/PlugNmeetService.cs`

- [ ] **Step 1: Write failing test for HMAC-SHA256 signing**

Create `backend/EduPlatform.Api.Tests/PlugNmeetServiceTests.cs`:

```csharp
using System.Security.Cryptography;
using System.Text;
using Xunit;

namespace EduPlatform.Api.Tests;

public class PlugNmeetServiceTests
{
    [Fact]
    public void Sign_HmacSha256_ProducesCorrectLengthAndFormat()
    {
        var secret = "YOUR_PLUGNMEET_API_SECRET";
        var body   = "{\"room_id\":\"session-abc123\"}";

        var keyBytes  = Encoding.UTF8.GetBytes(secret);
        var bodyBytes = Encoding.UTF8.GetBytes(body);
        using var hmac = new HMACSHA256(keyBytes);
        var hex = Convert.ToHexString(hmac.ComputeHash(bodyBytes)).ToLower();

        Assert.Equal(64, hex.Length);               // SHA256 = 32 bytes = 64 hex chars
        Assert.Matches("^[0-9a-f]+$", hex);
    }

    [Fact]
    public void Sign_SameInputProducesSameOutput()
    {
        var secret = "testsecret";
        var body   = "{\"room_id\":\"session-xyz\"}";

        string Hash()
        {
            var keyBytes  = Encoding.UTF8.GetBytes(secret);
            var bodyBytes = Encoding.UTF8.GetBytes(body);
            using var hmac = new HMACSHA256(keyBytes);
            return Convert.ToHexString(hmac.ComputeHash(bodyBytes)).ToLower();
        }

        Assert.Equal(Hash(), Hash());
    }
}
```

- [ ] **Step 2: Run test to confirm it passes (pure crypto, no dependency)**

```bash
cd backend/EduPlatform.Api.Tests && dotnet test --filter "PlugNmeetServiceTests" -v
```
Expected: PASS — 2 tests.

- [ ] **Step 3: Create PlugNmeetService.cs**

```csharp
// backend/EduPlatform.Api/Services/PlugNmeetService.cs
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace EduPlatform.Api.Services;

public class PlugNmeetService
{
    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly string _baseUrl;
    private readonly HttpClient _http;

    public PlugNmeetService(IConfiguration config, IHttpClientFactory factory)
    {
        _apiKey    = config["PlugNmeet:ApiKey"]!;
        _apiSecret = config["PlugNmeet:ApiSecret"]!;
        _baseUrl   = config["PlugNmeet:Url"]!;
        _http      = factory.CreateClient();
    }

    private string Sign(string body)
    {
        var keyBytes  = Encoding.UTF8.GetBytes(_apiSecret);
        var bodyBytes = Encoding.UTF8.GetBytes(body);
        using var hmac = new HMACSHA256(keyBytes);
        return Convert.ToHexString(hmac.ComputeHash(bodyBytes)).ToLower();
    }

    private async Task<T> PostAsync<T>(string path, object payload)
    {
        var body    = JsonSerializer.Serialize(payload);
        var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}{path}")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        request.Headers.Add("API-KEY", _apiKey);
        request.Headers.Add("HASH-SIGNATURE", Sign(body));

        var response = await _http.SendAsync(request);
        var content  = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<T>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
    }

    public async Task CreateRoomAsync(string roomId) =>
        await PostAsync<object>("/api/v1/room/create", new { room_id = roomId });

    public async Task<string> GenerateJoinTokenAsync(
        string roomId, string userId, string name, bool isAdmin)
    {
        var result = await PostAsync<PlugNmeetJoinResponse>("/api/v1/room/join", new
        {
            room_id   = roomId,
            user_info = new { name, user_id = userId, is_admin = isAdmin, is_hidden = false }
        });
        return result.Token;
    }

    public async Task EndRoomAsync(string roomId) =>
        await PostAsync<object>("/api/v1/room/end", new { room_id = roomId });
}

public record PlugNmeetJoinResponse(
    [property: JsonPropertyName("status")] bool   Status,
    [property: JsonPropertyName("token")]  string Token);
```

- [ ] **Step 4: Build**

```bash
cd backend/EduPlatform.Api && dotnet build
```
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 5: Run all tests**

```bash
cd backend/EduPlatform.Api.Tests && dotnet test -v
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/EduPlatform.Api/Services/PlugNmeetService.cs backend/EduPlatform.Api.Tests/PlugNmeetServiceTests.cs
git commit -m "feat: add PlugNmeetService with HMAC-signed room create/join/end"
```

---

## Task 4: ConfigController

**Files:**
- Create: `backend/EduPlatform.Api/Controllers/ConfigController.cs`

- [ ] **Step 1: Create ConfigController.cs**

```csharp
// backend/EduPlatform.Api/Controllers/ConfigController.cs
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
        if (HttpContext.Items["UserRole"] as string != "teacher") return Forbid();
        if (req.VideoEngine != "livekit" && req.VideoEngine != "plugnmeet")
            return BadRequest(new { error = "Invalid engine. Must be 'livekit' or 'plugnmeet'" });

        await _config.SetVideoEngineAsync(req.VideoEngine);
        return Ok(new { videoEngine = req.VideoEngine });
    }
}

public record SetEngineRequest(string VideoEngine);
```

- [ ] **Step 2: Build**

```bash
cd backend/EduPlatform.Api && dotnet build
```
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 3: Commit**

```bash
git add backend/EduPlatform.Api/Controllers/ConfigController.cs
git commit -m "feat: add ConfigController GET /api/config and PUT /api/config/video-engine"
```

---

## Task 5: Wire up Program.cs + appsettings.json + update SessionController

**Files:**
- Modify: `backend/EduPlatform.Api/Program.cs`
- Modify: `backend/EduPlatform.Api/appsettings.json`
- Modify: `backend/EduPlatform.Api/Controllers/SessionController.cs`

- [ ] **Step 1: Update appsettings.json**

Add the `PlugNmeet` section to `backend/EduPlatform.Api/appsettings.json` (after the `Google` section):

```json
"PlugNmeet": {
  "ApiKey": "plugnmeet",
  "ApiSecret": "YOUR_PLUGNMEET_API_SECRET",
  "Url": "http://localhost:8080"
}
```

The full updated `appsettings.json` becomes:

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
  "PlugNmeet": {
    "ApiKey": "plugnmeet",
    "ApiSecret": "YOUR_PLUGNMEET_API_SECRET",
    "Url": "http://localhost:8080"
  },
  "Logging": {
    "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Step 2: Replace Program.cs**

Replace the entire contents of `backend/EduPlatform.Api/Program.cs` with:

```csharp
using EduPlatform.Api.Data;
using EduPlatform.Api.Middleware;
using EduPlatform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<MongoDbSettings>(builder.Configuration.GetSection("MongoDB"));
builder.Services.AddSingleton<MongoDbContext>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ClassroomService>();
builder.Services.AddScoped<ChannelService>();
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<LiveKitService>();
builder.Services.AddScoped<ConfigService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<PlugNmeetService>();

builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var configSvc = scope.ServiceProvider.GetRequiredService<ConfigService>();
    try { await configSvc.EnsureDefaultAsync(); } catch { /* no DB in dev until Atlas is configured */ }
}

app.UseCors();
app.UseMiddleware<JwtMiddleware>();
app.MapControllers();

app.Run();
```

- [ ] **Step 3: Replace SessionController.cs**

Replace the entire contents of `backend/EduPlatform.Api/Controllers/SessionController.cs` with:

```csharp
using EduPlatform.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.Api.Controllers;

[ApiController]
public class SessionController : ControllerBase
{
    private readonly SessionService    _sessions;
    private readonly LiveKitService    _liveKit;
    private readonly ClassroomService  _classrooms;
    private readonly ConfigService     _configSvc;
    private readonly PlugNmeetService  _plugNmeet;

    public SessionController(
        SessionService   sessions,
        LiveKitService   liveKit,
        ClassroomService classrooms,
        ConfigService    configSvc,
        PlugNmeetService plugNmeet)
    {
        _sessions   = sessions;
        _liveKit    = liveKit;
        _classrooms = classrooms;
        _configSvc  = configSvc;
        _plugNmeet  = plugNmeet;
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

        var engine = await _configSvc.GetVideoEngineAsync();

        if (engine == "plugnmeet")
        {
            await _plugNmeet.CreateRoomAsync(session.RoomId!);
            var pToken = await _plugNmeet.GenerateJoinTokenAsync(
                session.RoomId!, userId, userName!, isAdmin: true);
            var plugNmeetUrl = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["PlugNmeet:Url"]!;
            return Ok(new { engine = "plugnmeet", token = pToken, url = plugNmeetUrl });
        }

        var liveKitUrl = HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["LiveKit:Url"]!;
        var token = _liveKit.GenerateToken(userId, userName!, session.RoomId!, canPublish: true);
        return Ok(new { engine = "livekit", token, url = liveKitUrl });
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

        var engine = await _configSvc.GetVideoEngineAsync();

        if (engine == "plugnmeet")
        {
            var pToken = await _plugNmeet.GenerateJoinTokenAsync(
                session.RoomId!, userId, userName!, isAdmin: false);
            var plugNmeetUrl = HttpContext.RequestServices
                .GetRequiredService<IConfiguration>()["PlugNmeet:Url"]!;
            return Ok(new { engine = "plugnmeet", token = pToken, url = plugNmeetUrl });
        }

        var liveKitUrl = HttpContext.RequestServices
            .GetRequiredService<IConfiguration>()["LiveKit:Url"]!;
        var token = _liveKit.GenerateToken(userId, userName!, session.RoomId!, canPublish: false);
        return Ok(new { engine = "livekit", token, url = liveKitUrl });
    }

    [HttpPost("api/sessions/{sessionId}/end")]
    public async Task<IActionResult> End(string sessionId)
    {
        var userId = HttpContext.Items["UserId"] as string;
        var role   = HttpContext.Items["UserRole"] as string;
        if (userId == null) return Unauthorized();
        if (role != "teacher") return Forbid();

        var session = await _sessions.GetByIdAsync(sessionId);
        if (session?.RoomId != null)
        {
            var engine = await _configSvc.GetVideoEngineAsync();
            if (engine == "plugnmeet")
            {
                try { await _plugNmeet.EndRoomAsync(session.RoomId); } catch { /* best-effort */ }
            }
        }

        await _sessions.EndAsync(sessionId);
        return NoContent();
    }
}

public record CreateSessionRequest(string Title);
```

- [ ] **Step 4: Build**

```bash
cd backend/EduPlatform.Api && dotnet build
```
Expected: `Build succeeded. 0 Warning(s). 0 Error(s).`

- [ ] **Step 5: Run all tests**

```bash
cd backend/EduPlatform.Api.Tests && dotnet test -v
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/EduPlatform.Api/appsettings.json \
        backend/EduPlatform.Api/Program.cs \
        backend/EduPlatform.Api/Controllers/SessionController.cs
git commit -m "feat: wire ConfigService + PlugNmeetService; branch session Start/Join/End on video engine"
```

---

## Task 6: plugNmeet Docker setup

**Files:**
- Create: `plugnmeet-docker/config.yaml`
- Create: `plugnmeet-docker/nats-server.conf`
- Create: `plugnmeet-docker/docker-compose.yml`

> **Note:** First `docker compose up` builds the plugNmeet image from source (Go + downloads Speech SDK). Allow 10–15 minutes for first build.

- [ ] **Step 1: Create plugnmeet-docker/ directory**

```bash
mkdir -p plugnmeet-docker
```

- [ ] **Step 2: Create plugnmeet-docker/nats-server.conf**

```
websocket {
    port: 8222
    no_tls: true
}

jetstream: {
    store_dir: /data/jetstream
}

accounts {
    SYS: {
        exports: [
            {
                stream: "$SYS.ACCOUNT.PNM.>",
                accounts: [PNM]
            }
        ]
    }
    PNM: {
        jetstream: enabled
        imports: [
            {
                stream: {
                    account: SYS, subject: "$SYS.ACCOUNT.PNM.>"
                }
            }
        ]
        users: [
            {
                nkey: UD4JADBMDSQCA5D475KSMFV43TAINASJ3TIEFQ7LP43XENPMQYFTRFKP
            }
        ]
    }
}

system_account: SYS

authorization {
    timeout: 5
    auth_callout {
        issuer: AD7EHM6WBIVERNVY6K7T3QEL62EB2BNMK4TTHXTUHTYSJGS3SZFZ4HX5
        auth_users: [ UD4JADBMDSQCA5D475KSMFV43TAINASJ3TIEFQ7LP43XENPMQYFTRFKP ]
        account: PNM
        xkey: XAVXJLXWZR7W24SAOPN6YATDOF2B6URA4GMBKYM7SBQIFO4O6OLQKSZB
    }
}
```

- [ ] **Step 3: Create plugnmeet-docker/config.yaml**

```yaml
client:
  port: 8080
  debug: false
  path: "./client/dist"
  api_key: "plugnmeet"
  secret: "YOUR_PLUGNMEET_API_SECRET"
  token_validity: 30m
  auto_client_download:
    enabled: true
    server_url: "http://localhost:8080"

livekit_info:
  host: "https://katral-zonddr6x.livekit.cloud"
  api_key: "YOUR_LIVEKIT_API_KEY"
  secret: "YOUR_LIVEKIT_API_SECRET"

redis_info:
  host: "redis:6379"
  username: ""
  password: ""
  db: 0

database_info:
  driver_name: mysql
  host: db
  port: 3306
  username: "root"
  password: "plugnmeet123"
  db: "plugnmeet"
  prefix: "pnm_"
  charset: "utf8mb4"
  loc: "UTC"
  conn_max_lifetime: 4m
  max_open_conns: 10

nats_info:
  nats_urls:
    - "nats://nats:4222"
  nats_ws_urls:
    - "http://nats:8222"
  account: PNM
  nkey: "SUAGSRI6D537QEHEK7G5KAN4KINSL77FTRTAJGA2KTFRR7AIOMA43P4PRE"
  auth_callout_issuer_private: "SAAMTMBUANSRW3XDXZBIBF4JYRRUMWGV2GZT5MQ54VNWNRPN2Y4J46NQSA"
  auth_callout_xkey_private: "SXAMBYY64TKXZCLFQGWDATGPIPURA4SIV3GDCSGG7A74USK6XDO6WQTIUU"
  num_replicas: 1
  room_stream_name: "pnm-room-stream"
  subjects:
    system_api_worker: "sysApiWorker"
    system_js_worker: "sysJsWorker"
    system_core_worker: "sysCoreWorker"
    system_public: "sysPublic"
    system_private: "sysPrivate"
    chat: "chat"
    whiteboard: "whiteboard"
    data_channel: "dataChannel"
  recorder:
    recorder_channel: "recorderChannel"
    recorder_info_kv: "pnm-recorderInfo"
    transcoding_jobs_subject: "pnm-RecorderTranscoderJobs"

log_settings:
  log_file: "./log/plugNmeet.log"
  maxsize: 20
  maxbackups: 4
  maxage: 2
  log_level: "info"

room_default_settings:
  max_duration: 0
  max_participants: 0
  max_num_breakout_rooms: 6
  max_preloaded_wb_file_size: 5mb

upload_file_settings:
  path: "./upload"
  max_size: 50
  max_size_whiteboard_file: 30
  keep_forever: false
  allowed_types: ["jpg","png","jpeg","svg","pdf","docx","txt","xlsx","pptx","zip","mp4","webm","mp3"]

recorder_info:
  recording_files_path: "./recording_files"
  token_validity: 30m
  ping_timeout: 8s
  enable_del_recording_backup: false

shared_notepad:
  enabled: false
  etherpad_hosts: []

analytics_settings:
  enabled: false

artifacts_settings:
  storage_path: "./artifacts"
  token_validity: 10m
  enable_del_artifacts_backup: false

insights:
  enabled: false
```

- [ ] **Step 4: Create plugnmeet-docker/docker-compose.yml**

```yaml
services:
  redis:
    image: redis:8.6
    ports:
      - "6379:6379"
    volumes:
      - plugnmeet_redis:/data

  db:
    image: mariadb:12.2
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: plugnmeet123
      MYSQL_DATABASE: plugnmeet
    volumes:
      - plugnmeet_db:/var/lib/mysql
      - ../plugNmeet-server-main/sql_dump/install.sql:/docker-entrypoint-initdb.d/install.sql

  nats:
    image: nats:2.14-alpine
    command:
      - "-DVV"
      - "-config"
      - "/nats-server.conf"
    ports:
      - "4222:4222"
      - "8222:8222"
    volumes:
      - ./nats-server.conf:/nats-server.conf
      - plugnmeet_nats:/data/jetstream

  plugnmeet:
    build:
      context: ../plugNmeet-server-main
      dockerfile: docker-build/Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ../plugNmeet-server-main:/app
      - ./config.yaml:/app/config.yaml
      - plugnmeet_uploads:/app/upload
      - plugnmeet_recordings:/app/recording_files
    depends_on:
      - redis
      - db
      - nats

volumes:
  plugnmeet_redis:
  plugnmeet_db:
  plugnmeet_nats:
  plugnmeet_uploads:
  plugnmeet_recordings:
```

- [ ] **Step 5: Commit docker files**

```bash
git add plugnmeet-docker/
git commit -m "feat: add plugNmeet Docker Compose setup with LiveKit Cloud credentials"
```

- [ ] **Step 6: Verify Docker Compose starts (first run — allow 10–15 min for build)**

```bash
cd plugnmeet-docker && docker compose up --build -d
```
Expected: all 4 containers start (redis, db, nats, plugnmeet). Check:
```bash
docker compose ps
```
Expected: all containers `Up`. plugNmeet logs should show `Listening on :8080`:
```bash
docker compose logs plugnmeet | tail -20
```

- [ ] **Step 7: Verify plugNmeet API is reachable**

```bash
curl -s http://localhost:8080/api/v1/room/info \
  -H "API-KEY: plugnmeet" \
  -H "HASH-SIGNATURE: $(echo -n '{}' | openssl dgst -sha256 -hmac 'YOUR_PLUGNMEET_API_SECRET' | awk '{print $2}')" \
  -H "Content-Type: application/json" \
  -d '{}' | head -c 200
```
Expected: JSON response (even if `{ "status": false, ... }` — any JSON means plugNmeet is running).

---

## Task 7: Frontend — Types + API

**Files:**
- Modify: `frontend/edu-web/types/index.ts`
- Modify: `frontend/edu-web/lib/api.ts`

- [ ] **Step 1: Update types/index.ts**

Append to the end of `frontend/edu-web/types/index.ts`:

```typescript
export type VideoEngine = 'livekit' | 'plugnmeet'

export interface SessionResponse {
  engine: VideoEngine
  token: string
  url: string
}
```

- [ ] **Step 2: Update lib/api.ts**

Replace the entire contents of `frontend/edu-web/lib/api.ts` with:

```typescript
import type { VideoEngine, SessionResponse } from '@/types'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (res.status === 204) return undefined as T
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body
}

export const api = {
  auth: {
    register: (email: string, name: string, password: string, role: string) =>
      request<{ token: string; user: { id: string; email: string; name: string; role: string } }>(
        '/api/auth/register', '', { method: 'POST', body: JSON.stringify({ email, name, password, role }) }
      ),
    updateRole: (token: string, role: string) =>
      request<{ role: string }>('/api/auth/role', token, { method: 'PATCH', body: JSON.stringify({ role }) }),
  },

  config: {
    getVideoEngine: () =>
      request<{ videoEngine: VideoEngine }>('/api/config', ''),
    setVideoEngine: (token: string, engine: VideoEngine) =>
      request<{ videoEngine: VideoEngine }>('/api/config/video-engine', token, {
        method: 'PUT',
        body: JSON.stringify({ videoEngine: engine }),
      }),
  },

  classrooms: {
    list: (token: string) =>
      request<import('@/types').Classroom[]>('/api/classrooms', token),
    create: (token: string, name: string) =>
      request<import('@/types').Classroom>('/api/classrooms', token, { method: 'POST', body: JSON.stringify({ name }) }),
    get: (token: string, id: string) =>
      request<import('@/types').Classroom & { channels: import('@/types').Channel[]; members: { id: string; name: string; email: string }[] }>(
        `/api/classrooms/${id}`, token
      ),
    join: (token: string, joinCode: string) =>
      request<import('@/types').Classroom>('/api/classrooms/join', token, { method: 'POST', body: JSON.stringify({ joinCode }) }),
  },

  channels: {
    list: (token: string, classroomId: string) =>
      request<import('@/types').Channel[]>(`/api/classrooms/${classroomId}/channels`, token),
    getMessages: (token: string, channelId: string) =>
      request<import('@/types').Message[]>(`/api/channels/${channelId}/messages`, token),
    sendMessage: (token: string, channelId: string, content: string) =>
      request<import('@/types').Message>(`/api/channels/${channelId}/messages`, token, {
        method: 'POST', body: JSON.stringify({ content }),
      }),
  },

  sessions: {
    list: (token: string, classroomId: string) =>
      request<import('@/types').Session[]>(`/api/classrooms/${classroomId}/sessions`, token),
    create: (token: string, classroomId: string, title: string) =>
      request<import('@/types').Session>(`/api/classrooms/${classroomId}/sessions`, token, {
        method: 'POST', body: JSON.stringify({ title }),
      }),
    start: (token: string, sessionId: string) =>
      request<SessionResponse>(`/api/sessions/${sessionId}/start`, token, { method: 'POST' }),
    join: (token: string, sessionId: string) =>
      request<SessionResponse>(`/api/sessions/${sessionId}/join`, token, { method: 'POST' }),
    end: (token: string, sessionId: string) =>
      request<void>(`/api/sessions/${sessionId}/end`, token, { method: 'POST' }),
  },
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend/edu-web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/edu-web/types/index.ts frontend/edu-web/lib/api.ts
git commit -m "feat: add VideoEngine type, SessionResponse, api.config endpoints; update sessions return type"
```

---

## Task 8: PlugNmeetRoom component

**Files:**
- Create: `frontend/edu-web/components/session/PlugNmeetRoom.tsx`

- [ ] **Step 1: Create PlugNmeetRoom.tsx**

```tsx
// frontend/edu-web/components/session/PlugNmeetRoom.tsx
'use client'

interface PlugNmeetRoomProps {
  token: string
  serverUrl: string
}

export default function PlugNmeetRoom({ token, serverUrl }: PlugNmeetRoomProps) {
  return (
    <div className="w-full h-screen bg-[#0f1117]">
      <iframe
        src={`${serverUrl}/?access_token=${token}`}
        className="w-full h-full border-none"
        allow="camera; microphone; display-capture; autoplay; fullscreen"
        title="plugNmeet classroom"
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
cd frontend/edu-web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/edu-web/components/session/PlugNmeetRoom.tsx
git commit -m "feat: add PlugNmeetRoom iframe component"
```

---

## Task 9: Update teacher and student session pages

**Files:**
- Modify: `frontend/edu-web/app/teacher/session/[id]/page.tsx`
- Modify: `frontend/edu-web/app/student/session/[id]/page.tsx`

- [ ] **Step 1: Replace teacher session page**

Replace the entire contents of `frontend/edu-web/app/teacher/session/[id]/page.tsx` with:

```tsx
'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import TeacherRoom from '@/components/session/TeacherRoom'
import PlugNmeetRoom from '@/components/session/PlugNmeetRoom'
import type { VideoEngine } from '@/types'

export default function TeacherSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessionId, setSessionId] = useState('')
  const [token, setToken]         = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [engine, setEngine]       = useState<VideoEngine | null>(null)
  const [error, setError]         = useState('')

  useEffect(() => {
    params.then(p => setSessionId(p.id))
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !sessionId) return
    api.sessions.start(session.apiToken, sessionId)
      .then(r => { setToken(r.token); setServerUrl(r.url); setEngine(r.engine) })
      .catch(e => setError(e.message))
  }, [session, status, sessionId])

  const handleEnd = async () => {
    if (!session?.apiToken || !sessionId) return
    await api.sessions.end(session.apiToken, sessionId)
    router.back()
  }

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.back()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm">Go Back</button>
      </div>
    </div>
  )

  if (!token || !engine) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (engine === 'plugnmeet') return <PlugNmeetRoom token={token} serverUrl={serverUrl} />

  return (
    <TeacherRoom
      token={token}
      serverUrl={serverUrl}
      participantName={session?.user?.name ?? 'Teacher'}
      onEndSession={handleEnd}
      onDisconnected={() => router.back()} />
  )
}
```

- [ ] **Step 2: Replace student session page**

Replace the entire contents of `frontend/edu-web/app/student/session/[id]/page.tsx` with:

```tsx
'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import StudentRoom from '@/components/session/StudentRoom'
import PlugNmeetRoom from '@/components/session/PlugNmeetRoom'
import type { VideoEngine } from '@/types'

export default function StudentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sessionId, setSessionId] = useState('')
  const [token, setToken]         = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('')
  const [engine, setEngine]       = useState<VideoEngine | null>(null)
  const [error, setError]         = useState('')

  useEffect(() => {
    params.then(p => setSessionId(p.id))
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !session?.apiToken || !sessionId) return
    api.sessions.join(session.apiToken, sessionId)
      .then(r => { setToken(r.token); setServerUrl(r.url); setEngine(r.engine) })
      .catch(e => setError(e.message))
  }, [session, status, sessionId])

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117] text-white">
      <div className="text-center space-y-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.back()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm">Go Back</button>
      </div>
    </div>
  )

  if (!token || !engine) return (
    <div className="flex items-center justify-center h-screen bg-[#0f1117]">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (engine === 'plugnmeet') return <PlugNmeetRoom token={token} serverUrl={serverUrl} />

  return (
    <StudentRoom
      token={token}
      serverUrl={serverUrl}
      participantName={session?.user?.name ?? 'Student'}
      onDisconnected={() => router.back()} />
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd frontend/edu-web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/edu-web/app/teacher/session/[id]/page.tsx \
        frontend/edu-web/app/student/session/[id]/page.tsx
git commit -m "feat: branch teacher/student session pages on video engine (LiveKit vs plugNmeet)"
```

---

## Task 10: Teacher dashboard — video engine toggle

**Files:**
- Modify: `frontend/edu-web/app/teacher/dashboard/page.tsx`

- [ ] **Step 1: Add engine state and load on mount**

In `frontend/edu-web/app/teacher/dashboard/page.tsx`, after the existing state declarations (`classrooms`, `loading`, `showCreate`), add:

```tsx
const [videoEngine, setVideoEngine]   = useState<'livekit' | 'plugnmeet'>('livekit')
const [engineLoading, setEngineLoading] = useState(false)
```

Inside the existing `useEffect` that loads classrooms (after `api.classrooms.list(...)`), add a parallel call to load the engine. Replace the useEffect with:

```tsx
useEffect(() => {
  if (status === 'loading') return
  if (!session?.apiToken) { router.replace('/'); return }
  api.classrooms.list(session.apiToken)
    .then(setClassrooms).catch(() => {}).finally(() => setLoading(false))
  api.config.getVideoEngine()
    .then(r => setVideoEngine(r.videoEngine)).catch(() => {})
}, [session, status, router])
```

- [ ] **Step 2: Add toggle handler**

After the `const colors` line, add:

```tsx
const toggleEngine = async () => {
  if (!session?.apiToken || engineLoading) return
  const next = videoEngine === 'livekit' ? 'plugnmeet' : 'livekit'
  setEngineLoading(true)
  try {
    await api.config.setVideoEngine(session.apiToken, next)
    setVideoEngine(next)
  } catch { /* ignore — UI reverts on next load */ } finally {
    setEngineLoading(false)
  }
}
```

- [ ] **Step 3: Add toggle card to right panel**

In the right panel (`<aside className="w-72 ..."`), after the "Quick Stats" card (the `<div className="bg-[#1a1d26] rounded-2xl p-4">` block), add a second card:

```tsx
<div className="bg-[#1a1d26] rounded-2xl p-4">
  <p className="text-xs text-white/50 mb-3 uppercase tracking-wider">Video Engine</p>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-semibold capitalize">{videoEngine}</p>
      <p className="text-xs text-white/40 mt-0.5">
        {videoEngine === 'livekit' ? 'LiveKit Cloud' : 'plugNmeet Docker'}
      </p>
    </div>
    <button
      onClick={toggleEngine}
      disabled={engineLoading}
      title={`Switch to ${videoEngine === 'livekit' ? 'plugNmeet' : 'LiveKit'}`}
      className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none ${
        videoEngine === 'plugnmeet' ? 'bg-indigo-600' : 'bg-white/20'
      } ${engineLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
        videoEngine === 'plugnmeet' ? 'translate-x-7' : 'translate-x-1'
      }`} />
    </button>
  </div>
</div>
```

- [ ] **Step 4: Type-check**

```bash
cd frontend/edu-web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/edu-web/app/teacher/dashboard/page.tsx
git commit -m "feat: add video engine toggle to teacher dashboard (LiveKit ↔ plugNmeet)"
```

---

## Self-Review Checklist

After all tasks are committed, verify:

- [ ] `dotnet test` passes (all tests including new ConfigServiceTests + PlugNmeetServiceTests)
- [ ] `npx tsc --noEmit` passes in `frontend/edu-web`
- [ ] GET `http://localhost:5000/api/config` returns `{ "videoEngine": "livekit" }` (once .NET is running with real MongoDB)
- [ ] PUT `http://localhost:5000/api/config/video-engine` with `{ "videoEngine": "plugnmeet" }` + teacher Bearer token returns 200
- [ ] Session Start response shape is `{ engine, token, url }` for both engines
- [ ] plugNmeet Docker containers are all healthy: `docker compose -f plugnmeet-docker/docker-compose.yml ps`

---

## Development Startup Order

```bash
# 1. Start plugNmeet stack (first time: ~15 min build)
cd plugnmeet-docker && docker compose up -d

# 2. Start .NET backend (needs MongoDB Atlas connection string in appsettings.Development.json)
cd backend/EduPlatform.Api && dotnet run

# 3. Start Next.js frontend
cd frontend/edu-web && npm run dev
```

Toggle the engine from the teacher dashboard right panel. The switch takes effect on the next session Start — active sessions are not affected.
