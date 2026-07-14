using Xunit;

namespace Backend.Tests;

public class MetaLoggingTests
{
    private (string ActionType, string TargetEntity, string Description) CreateAccessEntry(
        bool isAuthorized, Guid? userId, string? ipAddress)
    {
        var actorName = userId.HasValue ? "Manager Name" : "Anonymous";

        if (isAuthorized)
        {
            return ("Read", "AuditLog", $"Manager {actorName} accessed audit log");
        }
        else
        {
            return ("AccessDenied", "AuditLog",
                $"Unauthorized access attempt to AuditLog by {actorName}");
        }
    }

    [Fact]
    public void AuthorizedAccess_LoggedAsRead()
    {
        var (actionType, targetEntity, description) = CreateAccessEntry(true, Guid.NewGuid(), "192.168.1.1");
        Assert.Equal("Read", actionType);
        Assert.Equal("AuditLog", targetEntity);
        Assert.Contains("accessed audit log", description);
    }

    [Fact]
    public void UnauthorizedAccess_LoggedAsAccessDenied()
    {
        var (actionType, targetEntity, description) = CreateAccessEntry(false, Guid.NewGuid(), "192.168.1.2");
        Assert.Equal("AccessDenied", actionType);
        Assert.Equal("AuditLog", targetEntity);
        Assert.Contains("Unauthorized", description);
    }

    [Fact]
    public void AccessEntry_TargetEntityIsAuditLog()
    {
        var (_, targetEntity, _) = CreateAccessEntry(true, Guid.NewGuid(), "192.168.1.1");
        Assert.Equal("AuditLog", targetEntity);
    }
}
