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
