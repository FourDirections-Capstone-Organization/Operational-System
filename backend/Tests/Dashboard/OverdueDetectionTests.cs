using Xunit;

namespace Backend.Tests.Dashboard;

public class OverdueDetectionTests
{
    private readonly int[] ActiveStatuses = { 0, 1, 2 };

    private bool IsOverdue(int status, DateTime deadline, DateTime now)
    {
        if (!ActiveStatuses.Contains(status))
            return false;

        return deadline < now;
    }

    [Fact]
    public void PastDeadline_InProgress_IsOverdue()
    {
        var now = new DateTime(2026, 7, 13, 19, 0, 0);
        var deadline = new DateTime(2026, 7, 12);
        Assert.True(IsOverdue(1, deadline, now));
    }

    [Fact]
    public void PastDeadline_NotStarted_IsOverdue()
    {
        var now = new DateTime(2026, 7, 13, 19, 0, 0);
        var deadline = new DateTime(2026, 7, 10);
        Assert.True(IsOverdue(0, deadline, now));
    }

    [Fact]
    public void FutureDeadline_IsNotOverdue()
    {
        var now = new DateTime(2026, 7, 13, 19, 0, 0);
        var deadline = new DateTime(2026, 7, 20);
        Assert.False(IsOverdue(1, deadline, now));
    }

    [Fact]
    public void Completed_PastDeadline_IsNotOverdue()
    {
        var now = new DateTime(2026, 7, 13, 19, 0, 0);
        var deadline = new DateTime(2026, 7, 10);
        Assert.False(IsOverdue(3, deadline, now));
    }

    [Fact]
    public void Cancelled_PastDeadline_IsNotOverdue()
    {
        var now = new DateTime(2026, 7, 13, 19, 0, 0);
        var deadline = new DateTime(2026, 7, 10);
        Assert.False(IsOverdue(5, deadline, now));
    }
}
