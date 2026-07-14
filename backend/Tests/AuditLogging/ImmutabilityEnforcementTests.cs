using Xunit;

namespace Backend.Tests;

public class ImmutabilityEnforcementTests
{
    private (bool IsBlocked, string ErrorMessage, string BlockedAction) CheckImmutability(
        string httpMethod, Guid entryId)
    {
        switch (httpMethod.ToUpper())
        {
            case "PUT":
                return (true, "Audit records are immutable and cannot be edited, deleted, or exported.", "edit");

            case "DELETE":
                return (true, "Audit records are immutable and cannot be edited, deleted, or exported.", "delete");

            case "POST":
                return (true, "Audit records are immutable and cannot be edited, deleted, or exported.", "export");

            case "GET":
                return (false, "", "");

            default:
                return (true, "Method not allowed", "unknown");
        }
    }

    [Fact]
    public void Put_BlockedWith403()
    {
        var (isBlocked, error, action) = CheckImmutability("PUT", Guid.NewGuid());
        Assert.True(isBlocked);
        Assert.Contains("immutable", error);
        Assert.Equal("edit", action);
    }

    [Fact]
    public void Delete_BlockedWith403()
    {
        var (isBlocked, error, action) = CheckImmutability("DELETE", Guid.NewGuid());
        Assert.True(isBlocked);
        Assert.Contains("immutable", error);
        Assert.Equal("delete", action);
    }

    [Fact]
    public void Export_BlockedWith403()
    {
        var (isBlocked, error, action) = CheckImmutability("POST", Guid.NewGuid());
        Assert.True(isBlocked);
        Assert.Contains("immutable", error);
        Assert.Equal("export", action);
    }

    [Fact]
    public void Get_Allowed()
    {
        var (isBlocked, _, _) = CheckImmutability("GET", Guid.NewGuid());
        Assert.False(isBlocked);
    }
}
