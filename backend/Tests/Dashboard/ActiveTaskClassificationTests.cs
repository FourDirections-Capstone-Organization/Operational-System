using Xunit;

namespace Backend.Tests.Dashboard;

public class ActiveTaskClassificationTests
{
    private readonly int[] ActiveStatuses = { 0, 1, 2 };

    private bool IsActiveTask(int status)
    {
        return ActiveStatuses.Contains(status);
    }

    [Fact]
    public void NotStarted_IsActive()
    {
        Assert.True(IsActiveTask(0));
    }

    [Fact]
    public void InProgress_IsActive()
    {
        Assert.True(IsActiveTask(1));
    }

    [Fact]
    public void DonePendingReview_IsActive()
    {
        Assert.True(IsActiveTask(2));
    }

    [Fact]
    public void Completed_IsNotActive()
    {
        Assert.False(IsActiveTask(3));
    }
}
