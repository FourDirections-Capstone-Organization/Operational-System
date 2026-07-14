using Xunit;

namespace Backend.Tests;

public class AuditLogFilterTests
{
    private List<(Guid Id, Guid? UserId, int ActionType, DateTime Timestamp, string Module)> ApplyFilters(
        List<(Guid Id, Guid? UserId, int ActionType, DateTime Timestamp, string Module)> entries,
        DateTime? dateStart, DateTime? dateEnd, Guid? userId, int? actionType, string? module)
    {
        var result = entries.AsEnumerable();

        if (dateStart.HasValue)
            result = result.Where(e => e.Timestamp >= dateStart.Value);

        if (dateEnd.HasValue)
            result = result.Where(e => e.Timestamp <= dateEnd.Value);

        if (userId.HasValue)
            result = result.Where(e => e.UserId == userId.Value);

        if (actionType.HasValue)
            result = result.Where(e => e.ActionType == actionType.Value);

        if (!string.IsNullOrWhiteSpace(module))
            result = result.Where(e => e.Module == module);

        return result.OrderByDescending(e => e.Timestamp).ToList();
    }

    [Fact]
    public void DateRangeFilter_FiltersCorrectly()
    {
        var userId = Guid.NewGuid();
        var entries = new List<(Guid, Guid?, int, DateTime, string)>
        {
            (Guid.NewGuid(), userId, 0, new DateTime(2026, 7, 1), "Auth"),
            (Guid.NewGuid(), userId, 0, new DateTime(2026, 7, 10), "Auth"),
            (Guid.NewGuid(), userId, 0, new DateTime(2026, 7, 15), "Auth")
        };

        var result = ApplyFilters(entries,
            new DateTime(2026, 7, 5), new DateTime(2026, 7, 12), null, null, null);
        Assert.Single(result);
    }

    [Fact]
    public void UserFilter_FiltersCorrectly()
    {
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var entries = new List<(Guid, Guid?, int, DateTime, string)>
        {
            (Guid.NewGuid(), user1, 0, DateTime.UtcNow, "Auth"),
            (Guid.NewGuid(), user2, 0, DateTime.UtcNow, "Auth"),
            (Guid.NewGuid(), user1, 0, DateTime.UtcNow, "Auth")
        };

        var result = ApplyFilters(entries, null, null, user1, null, null);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void ActionTypeFilter_FiltersCorrectly()
    {
        var userId = Guid.NewGuid();
        var entries = new List<(Guid, Guid?, int, DateTime, string)>
        {
            (Guid.NewGuid(), userId, 0, DateTime.UtcNow, "Auth"),
            (Guid.NewGuid(), userId, 2, DateTime.UtcNow, "TaskMgmt"),
            (Guid.NewGuid(), userId, 0, DateTime.UtcNow, "Auth")
        };

        var result = ApplyFilters(entries, null, null, null, 0, null);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void ModuleFilter_FiltersCorrectly()
    {
        var userId = Guid.NewGuid();
        var entries = new List<(Guid, Guid?, int, DateTime, string)>
        {
            (Guid.NewGuid(), userId, 0, DateTime.UtcNow, "Authentication"),
            (Guid.NewGuid(), userId, 2, DateTime.UtcNow, "TaskManagement"),
            (Guid.NewGuid(), userId, 0, DateTime.UtcNow, "Authentication")
        };

        var result = ApplyFilters(entries, null, null, null, null, "Authentication");
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void CombinedFilters_AllApplied()
    {
        var userId = Guid.NewGuid();
        var entries = new List<(Guid, Guid?, int, DateTime, string)>
        {
            (Guid.NewGuid(), userId, 0, new DateTime(2026, 7, 10), "Authentication"),
            (Guid.NewGuid(), userId, 2, new DateTime(2026, 7, 10), "TaskManagement"),
            (Guid.NewGuid(), userId, 0, new DateTime(2026, 7, 10), "TaskManagement")
        };

        var result = ApplyFilters(entries, null, null, userId, 0, "TaskManagement");
        Assert.Single(result);
    }
}
