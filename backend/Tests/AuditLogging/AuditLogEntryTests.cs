using Xunit;

namespace Backend.Tests;

public class AuditLogEntryTests
{
    private (Guid Id, DateTime Timestamp, bool IsValid) CreateAuditEntry(
        Guid? userId, int actionType, string targetEntity, string description, string module)
    {
        if (string.IsNullOrWhiteSpace(targetEntity))
            return (Guid.Empty, DateTime.MinValue, false);

        if (string.IsNullOrWhiteSpace(description))
            return (Guid.Empty, DateTime.MinValue, false);

        if (string.IsNullOrWhiteSpace(module))
            return (Guid.Empty, DateTime.MinValue, false);

        return (Guid.NewGuid(), DateTime.UtcNow, true);
    }

    [Fact]
    public void RequiredFields_Populated()
    {
        var (id, timestamp, isValid) = CreateAuditEntry(
            Guid.NewGuid(), 0, "Task", "Task created", "TaskManagement");

        Assert.True(isValid);
        Assert.NotEqual(Guid.Empty, id);
    }

    [Fact]
    public void Timestamp_IsUtc()
    {
        var (_, timestamp, _) = CreateAuditEntry(
            Guid.NewGuid(), 0, "Task", "Task created", "TaskManagement");

        Assert.Equal(DateTimeKind.Utc, timestamp.Kind);
    }

    [Fact]
    public void EmptyTargetEntity_Invalid()
    {
        var (_, _, isValid) = CreateAuditEntry(
            Guid.NewGuid(), 0, "", "Task created", "TaskManagement");

        Assert.False(isValid);
    }

    [Fact]
    public void EmptyDescription_Invalid()
    {
        var (_, _, isValid) = CreateAuditEntry(
            Guid.NewGuid(), 0, "Task", "", "TaskManagement");

        Assert.False(isValid);
    }
}
