using Xunit;

namespace Backend.Tests.Notifications;

public class OverdueDetectionTests
{
    private bool IsTaskOverdue(DateTime deadline, DateTime now, int status)
    {
        var isCompleted = status == 3;
        var isCancelled = status == 5;

        return deadline < now && !isCompleted && !isCancelled;
    }

    [Fact]
    public void Task_WithPastDeadline_IsOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-2);
        Assert.True(IsTaskOverdue(deadline, now, 0));
    }

    [Fact]
    public void Task_WithFutureDeadline_IsNotOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(2);
        Assert.False(IsTaskOverdue(deadline, now, 0));
    }

    [Fact]
    public void CompletedTask_IsNotOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-2);
        Assert.False(IsTaskOverdue(deadline, now, 3));
    }

    [Fact]
    public void CancelledTask_IsNotOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-2);
        Assert.False(IsTaskOverdue(deadline, now, 5));
    }

    [Fact]
    public void InProgressTask_WithPastDeadline_IsOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-1);
        Assert.True(IsTaskOverdue(deadline, now, 1));
    }

    [Fact]
    public void OnHoldTask_WithPastDeadline_IsOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-1);
        Assert.True(IsTaskOverdue(deadline, now, 4));
    }

    [Fact]
    public void NotStartedTask_WithPastDeadline_IsOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-1);
        Assert.True(IsTaskOverdue(deadline, now, 0));
    }

    [Fact]
    public void DonePendingReview_WithPastDeadline_IsOverdue()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(-1);
        Assert.True(IsTaskOverdue(deadline, now, 2));
    }
}
