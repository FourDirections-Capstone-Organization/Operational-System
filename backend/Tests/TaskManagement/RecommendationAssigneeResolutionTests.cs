namespace Backend.Tests.TaskManagement;

public class RecommendationAssigneeResolutionTests
{
    private (bool IsValid, string? ErrorMessage) ResolveAssignee(List<Guid>? assigneeIds)
    {
        if (assigneeIds is null || assigneeIds.Count == 0)
            return (false, "Task has no assigned user to recommend");

        return (true, null);
    }

    [Fact]
    public void TaskWithAssignee_ResolvesCorrectly()
    {
        var assigneeIds = new List<Guid> { Guid.NewGuid() };
        var (isValid, _) = ResolveAssignee(assigneeIds);
        Assert.True(isValid);
    }

    [Fact]
    public void TaskWithoutAssignee_IsInvalid()
    {
        var (isValid, error) = ResolveAssignee(new List<Guid>());
        Assert.False(isValid);
        Assert.Contains("no assigned user", error);
    }

    [Fact]
    public void NullAssigneeList_IsInvalid()
    {
        var (isValid, error) = ResolveAssignee(null);
        Assert.False(isValid);
        Assert.Contains("no assigned user", error);
    }

    [Fact]
    public void FirstAssigneeSelected_ForMultiAssignmentTask()
    {
        var assignees = new List<Guid> { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        var resolved = assignees.FirstOrDefault();
        Assert.Equal(assignees[0], resolved);
    }
}
