namespace Backend.Tests.Analytics;

public class RevisedDeadlineConsistencyTests
{
    private bool IsOverdue(DateTime? deadline, DateTime? revisedDeadline, DateTime now)
    {
        var effectiveDeadline = revisedDeadline ?? deadline;
        return effectiveDeadline < now;
    }

    [Fact]
    public void TaskWithRevisedDeadline_UsesRevisedForOverdue()
    {
        var originalDeadline = new DateTime(2026, 7, 20, 10, 0, 0);
        var revisedDeadline = new DateTime(2026, 7, 25, 10, 0, 0);
        var now = new DateTime(2026, 7, 22, 10, 0, 0);

        var overdue = IsOverdue(originalDeadline, revisedDeadline, now);

        Assert.False(overdue);
    }

    [Fact]
    public void TaskWithoutRevisedDeadline_UsesOriginal()
    {
        var originalDeadline = new DateTime(2026, 7, 20, 10, 0, 0);
        DateTime? revisedDeadline = null;
        var now = new DateTime(2026, 7, 22, 10, 0, 0);

        var overdue = IsOverdue(originalDeadline, revisedDeadline, now);

        Assert.True(overdue);
    }

    [Fact]
    public void RevisedDeadlineExtendsPastOriginal_NotOverdue()
    {
        var originalDeadline = new DateTime(2026, 7, 20, 10, 0, 0);
        var revisedDeadline = new DateTime(2026, 7, 28, 10, 0, 0);
        var now = new DateTime(2026, 7, 22, 10, 0, 0);

        var overdue = IsOverdue(originalDeadline, revisedDeadline, now);

        Assert.False(overdue);

        var wouldBeOverdueWithoutRevision = IsOverdue(originalDeadline, null, now);
        Assert.True(wouldBeOverdueWithoutRevision);
    }
}
