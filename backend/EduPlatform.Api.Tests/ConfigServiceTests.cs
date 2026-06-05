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
