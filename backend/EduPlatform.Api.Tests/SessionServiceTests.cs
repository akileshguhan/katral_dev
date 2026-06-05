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
