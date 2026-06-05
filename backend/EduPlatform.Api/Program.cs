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
builder.Services.AddScoped<AttendanceService>();

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
