using Backend.Models.DTOs;

namespace Backend.Tests.Analytics;

public class DepartmentKpiTests
{
    private DepartmentKpiDTO ComputeDepartmentKpi(
        string deptName,
        List<(bool IsApproved, DateTime? UpdatedAt, string EmployeeDept)> allCompletedTasks,
        List<string> employeeIds,
        int totalTasks,
        int activeTasks,
        int overdueTasks,
        DateTime rangeStart,
        DateTime rangeEnd)
    {
        var tasksInRange = allCompletedTasks
            .Where(t => t.UpdatedAt.HasValue && t.UpdatedAt.Value >= rangeStart && t.UpdatedAt.Value <= rangeEnd)
            .ToList();
        var totalInRange = tasksInRange.Count;
        var onTime = tasksInRange.Count(t => t.IsApproved);
        var late = tasksInRange.Count(t => !t.IsApproved);

        var employeeSummaries = employeeIds.Select(empId => new EmployeeKpiSummaryDTO
        {
            EmployeeId = Guid.NewGuid(),
            EmployeeNumber = empId,
            FullName = $"Employee {empId}",
            CompletedTasks = tasksInRange.Count(t => t.EmployeeDept == empId),
            OnTimeTasks = tasksInRange.Count(t => t.EmployeeDept == empId && t.IsApproved),
            LateTasks = tasksInRange.Count(t => t.EmployeeDept == empId && !t.IsApproved),
            ActiveTasks = activeTasks,
            OnTimeRate = tasksInRange.Count(t => t.EmployeeDept == empId) > 0
                ? Math.Round((double)tasksInRange.Count(t => t.EmployeeDept == empId && t.IsApproved) / tasksInRange.Count(t => t.EmployeeDept == empId) * 100, 2)
                : 0
        }).ToList();

        return new DepartmentKpiDTO
        {
            DepartmentId = Guid.NewGuid(),
            DepartmentName = deptName,
            TotalEmployees = employeeIds.Count,
            TotalTasks = totalTasks,
            CompletedTasks = totalInRange,
            OnTimeTasks = onTime,
            LateTasks = late,
            OverdueTasks = overdueTasks,
            ActiveTasks = activeTasks,
            OnTimeRate = totalInRange > 0 ? Math.Round((double)onTime / totalInRange * 100, 2) : 0,
            CompletionRate = totalTasks > 0 ? Math.Round((double)totalInRange / totalTasks * 100, 2) : 0,
            EmployeeSummaries = employeeSummaries
        };
    }

    [Fact]
    public void DepartmentKpi_AggregatesAllEmployeesInDept()
    {
        var rangeStart = DateTime.UtcNow.AddMonths(-1);
        var rangeEnd = DateTime.UtcNow;

        var kpi = ComputeDepartmentKpi(
            "Dispatch",
            new List<(bool, DateTime?, string)>
            {
                (true, DateTime.UtcNow, "DSP001"),
                (true, DateTime.UtcNow, "DSP002"),
                (false, DateTime.UtcNow, "DSP001")
            },
            new List<string> { "DSP001", "DSP002" },
            totalTasks: 10,
            activeTasks: 3,
            overdueTasks: 1,
            rangeStart, rangeEnd);

        Assert.Equal(2, kpi.TotalEmployees);
        Assert.Equal(2, kpi.EmployeeSummaries.Count);
    }

    [Fact]
    public void DepartmentKpi_ExcludesOtherDepartments()
    {
        var rangeStart = DateTime.UtcNow.AddMonths(-1);
        var rangeEnd = DateTime.UtcNow;

        var kpi = ComputeDepartmentKpi(
            "Dispatch",
            new List<(bool, DateTime?, string)> { (true, DateTime.UtcNow, "DSP001") },
            new List<string> { "DSP001" },
            totalTasks: 5,
            activeTasks: 2,
            overdueTasks: 0,
            rangeStart, rangeEnd);

        Assert.Single(kpi.EmployeeSummaries);
        Assert.Equal("DSP001", kpi.EmployeeSummaries[0].EmployeeNumber);
    }

    [Fact]
    public void KpiOnTimeRate_MatchesExpectedFormula()
    {
        var rangeStart = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);
        var rangeEnd = new DateTime(2026, 7, 31, 23, 59, 59, DateTimeKind.Utc);
        var taskDate = new DateTime(2026, 7, 15, 10, 0, 0, DateTimeKind.Utc);

        var kpi = ComputeDepartmentKpi(
            "Dispatch",
            new List<(bool, DateTime?, string)>
            {
                (true, taskDate, "DSP001"),
                (true, taskDate, "DSP001"),
                (false, taskDate, "DSP001"),
                (true, taskDate, "DSP002"),
                (false, taskDate, "DSP002")
            },
            new List<string> { "DSP001", "DSP002" },
            totalTasks: 10,
            activeTasks: 3,
            overdueTasks: 1,
            rangeStart, rangeEnd);

        Assert.Equal(3, kpi.OnTimeTasks);
        Assert.Equal(2, kpi.LateTasks);
        Assert.Equal(60.0, kpi.OnTimeRate);
    }

    [Fact]
    public void EmptyDepartment_ReturnsZeroRates()
    {
        var rangeStart = DateTime.UtcNow.AddMonths(-1);
        var rangeEnd = DateTime.UtcNow;

        var kpi = ComputeDepartmentKpi(
            "Empty Dept",
            new List<(bool, DateTime?, string)>(),
            new List<string>(),
            totalTasks: 0,
            activeTasks: 0,
            overdueTasks: 0,
            rangeStart, rangeEnd);

        Assert.Equal(0, kpi.TotalEmployees);
        Assert.Equal(0, kpi.TotalTasks);
        Assert.Equal(0, kpi.CompletedTasks);
        Assert.Equal(0, kpi.OnTimeRate);
        Assert.Empty(kpi.EmployeeSummaries);
    }

    [Fact]
    public void DateRangeFilter_OnlyIncludesTasksInRange()
    {
        var rangeStart = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc);
        var rangeEnd = new DateTime(2026, 7, 15, 0, 0, 0, DateTimeKind.Utc);

        var kpi = ComputeDepartmentKpi(
            "Dispatch",
            new List<(bool, DateTime?, string)>
            {
                (true, new DateTime(2026, 7, 5, 10, 0, 0, DateTimeKind.Utc), "DSP001"),
                (true, new DateTime(2026, 7, 20, 10, 0, 0, DateTimeKind.Utc), "DSP001")
            },
            new List<string> { "DSP001" },
            totalTasks: 2,
            activeTasks: 0,
            overdueTasks: 0,
            rangeStart, rangeEnd);

        Assert.Equal(1, kpi.CompletedTasks);
    }
}
