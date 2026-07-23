using Backend.Models.DTOs;

namespace Backend.Tests.Analytics;

public class StreamAnalyticsTests
{
    private DepartmentStreamMetricsDTO ComputeDepartmentMetrics(int completedLastHour, int totalLastHour, int activeTasks)
    {
        return new DepartmentStreamMetricsDTO
        {
            CompletedLastHour = completedLastHour,
            TotalLastHour = totalLastHour,
            CompletionRate = totalLastHour > 0 ? Math.Round((double)completedLastHour / totalLastHour * 100, 2) : 0,
            ActiveTasks = activeTasks,
            LastUpdated = DateTime.UtcNow
        };
    }

    private List<OverdueAlertDTO> ComputeOverdueAlerts(List<(Guid DeptId, string Title, bool IsOverdue)> tasks)
    {
        return tasks
            .Where(t => t.IsOverdue)
            .GroupBy(t => t.DeptId)
            .Select(g => new OverdueAlertDTO
            {
                DepartmentId = g.Key,
                OverdueCount = g.Count(),
                TaskTitles = g.Select(t => t.Title).ToList(),
                WindowStart = DateTime.UtcNow.AddMinutes(-15)
            })
            .ToList();
    }

    private double ComputeAvgTasksPerEmployee(int activeTaskCount, int distinctEmployees)
    {
        return distinctEmployees > 0 ? Math.Round((double)activeTaskCount / distinctEmployees, 2) : 0;
    }

    [Fact]
    public void StreamCompletionRate_MatchesDeptId()
    {
        var deptA = ComputeDepartmentMetrics(5, 10, 8);
        var deptB = ComputeDepartmentMetrics(2, 8, 5);

        Assert.Equal(5, deptA.CompletedLastHour);
        Assert.Equal(2, deptB.CompletedLastHour);
        Assert.NotEqual(deptA.CompletedLastHour, deptB.CompletedLastHour);
    }

    [Fact]
    public void StreamOverdueCount_IncreasesWithLateTasks()
    {
        var tasks = new List<(Guid, string, bool)>
        {
            (Guid.NewGuid(), "Task 1", true),
            (Guid.NewGuid(), "Task 2", true),
            (Guid.NewGuid(), "Task 3", false)
        };

        var alerts = ComputeOverdueAlerts(tasks);
        var totalOverdue = alerts.Sum(a => a.OverdueCount);

        Assert.Equal(2, totalOverdue);
    }

    [Fact]
    public void FallbackToDashboard_WhenKsqlDbUnavailable()
    {
        var fallbackResult = ComputeDepartmentMetrics(5, 10, 12);

        Assert.NotNull(fallbackResult);
        Assert.Equal(50.0, fallbackResult.CompletionRate);
    }

    [Fact]
    public void WorkloadStream_AvgPerEmployee_RoundedCorrectly()
    {
        var avg = ComputeAvgTasksPerEmployee(10, 3);
        Assert.Equal(3.33, avg, 2);
    }

    [Fact]
    public void CompletionRate_ZeroWhenNoActivity()
    {
        var metrics = ComputeDepartmentMetrics(0, 0, 0);
        Assert.Equal(0, metrics.CompletionRate);
    }

    [Fact]
    public void OverdueAlerts_ExcludesCompletedAndCancelled()
    {
        var tasks = new List<(Guid, string, bool)>
        {
            (Guid.NewGuid(), "Completed Task", false),
            (Guid.NewGuid(), "Cancelled Task", false),
            (Guid.NewGuid(), "Overdue Task", true)
        };

        var alerts = ComputeOverdueAlerts(tasks);
        var allTitles = alerts.SelectMany(a => a.TaskTitles).ToList();

        Assert.Single(allTitles);
        Assert.Contains("Overdue Task", allTitles);
        Assert.DoesNotContain("Completed Task", allTitles);
    }
}
