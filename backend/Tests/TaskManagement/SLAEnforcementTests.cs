using Xunit;

namespace Backend.Tests;

public class SLAEnforcementTests
{
    private (DateTime Deadline, bool IsSLALocked) ApplySLA(
        int priorityLevel, DateTime? manualDeadline, DateTime now)
    {
        var deadline = manualDeadline;
        var isSLALocked = false;

        if (priorityLevel == 3)
        {
            deadline = now.AddHours(24);
            isSLALocked = true;
        }
        else
        {
            if (!deadline.HasValue)
                throw new ArgumentException("Deadline is required for non-Urgent tasks");

            if (deadline.Value <= now)
                throw new ArgumentException("Deadline must be a future date/time");
        }

        return (deadline.Value, isSLALocked);
    }

    [Fact]
    public void UrgentTask_AutoSetsDeadlineTo24Hours()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var (deadline, isSLALocked) = ApplySLA(3, null, now);

        Assert.Equal(now.AddHours(24), deadline);
        Assert.True(isSLALocked);
    }

    [Fact]
    public void UrgentTask_IgnoresManualDeadline()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var manualDeadline = new DateTime(2027, 1, 1);
        var (deadline, _) = ApplySLA(3, manualDeadline, now);

        Assert.Equal(now.AddHours(24), deadline);
        Assert.NotEqual(manualDeadline, deadline);
    }

    [Fact]
    public void NonUrgentTask_KeepsManualDeadline()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var manualDeadline = new DateTime(2026, 8, 1, 17, 0, 0);
        var (deadline, isSLALocked) = ApplySLA(1, manualDeadline, now);

        Assert.Equal(manualDeadline, deadline);
        Assert.False(isSLALocked);
    }

    [Fact]
    public void NonUrgentTask_WithoutDeadline_Throws()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var ex = Assert.Throws<ArgumentException>(() => ApplySLA(1, null, now));
        Assert.Contains("Deadline is required", ex.Message);
    }

    [Fact]
    public void NonUrgentTask_PastDeadline_Throws()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var pastDeadline = new DateTime(2020, 1, 1);
        var ex = Assert.Throws<ArgumentException>(() => ApplySLA(1, pastDeadline, now));
        Assert.Contains("future date", ex.Message);
    }
}