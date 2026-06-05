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
        Assert.True(codes.Distinct().Count() > 1);
    }
}
