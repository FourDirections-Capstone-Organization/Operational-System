using Xunit;

namespace Backend.Tests.Dashboard;

public class WorkloadCalculationTests
{
    private Dictionary<Guid, int> CalculateWorkload(
        List<(Guid TaskId, List<Guid> AssigneeIds, int Status)> tasks)
    {
        var activeStatuses = new[] { 0, 1, 2 };
        var workload = new Dictionary<Guid, int>();

        foreach (var task in tasks)
        {
            if (!activeStatuses.Contains(task.Status))
                continue;

            foreach (var assigneeId in task.AssigneeIds)
            {
                if (!workload.ContainsKey(assigneeId))
                    workload[assigneeId] = 0;

                workload[assigneeId]++;
            }
        }

        return workload;
    }

    [Fact]
    public void SingleAssignee_CountedOnce()
    {
        var userId = Guid.NewGuid();
        var tasks = new List<(Guid, List<Guid>, int)>
        {
            (Guid.NewGuid(), new List<Guid> { userId }, 1)
        };

        var workload = CalculateWorkload(tasks);
        Assert.Equal(1, workload[userId]);
    }

    [Fact]
    public void MultipleAssignees_EachCounted()
    {
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var tasks = new List<(Guid, List<Guid>, int)>
        {
            (Guid.NewGuid(), new List<Guid> { user1, user2 }, 1)
        };

        var workload = CalculateWorkload(tasks);
        Assert.Equal(1, workload[user1]);
        Assert.Equal(1, workload[user2]);
    }

    [Fact]
    public void CompletedTask_NotCounted()
    {
        var userId = Guid.NewGuid();
        var tasks = new List<(Guid, List<Guid>, int)>
        {
            (Guid.NewGuid(), new List<Guid> { userId }, 3)
        };

        var workload = CalculateWorkload(tasks);
        Assert.Empty(workload);
    }

    [Fact]
    public void MultipleTasks_Accumulated()
    {
        var userId = Guid.NewGuid();
        var tasks = new List<(Guid, List<Guid>, int)>
        {
            (Guid.NewGuid(), new List<Guid> { userId }, 0),
            (Guid.NewGuid(), new List<Guid> { userId }, 1),
            (Guid.NewGuid(), new List<Guid> { userId }, 2)
        };

        var workload = CalculateWorkload(tasks);
        Assert.Equal(3, workload[userId]);
    }
}
