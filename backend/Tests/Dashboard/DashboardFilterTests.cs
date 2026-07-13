using Xunit;

namespace Backend.Tests.Dashboard;

public class DashboardFilterTests
{
    private List<(Guid Id, DateTime CreatedAt, Guid? DeptId, int Status)> ApplyFilters(
        List<(Guid Id, DateTime CreatedAt, Guid? DeptId, int Status)> tasks,
        DateTime? dateStart, DateTime? dateEnd, Guid? deptId, int? status)
    {
        var result = tasks.AsEnumerable();

        if (dateStart.HasValue)
            result = result.Where(t => t.CreatedAt >= dateStart.Value);

        if (dateEnd.HasValue)
            result = result.Where(t => t.CreatedAt <= dateEnd.Value);

        if (deptId.HasValue)
            result = result.Where(t => t.DeptId == deptId.Value);

        if (status.HasValue)
            result = result.Where(t => t.Status == status.Value);

        return result.ToList();
    }

    [Fact]
    public void DateRangeFilter_FiltersCorrectly()
    {
        var deptId = Guid.NewGuid();
        var tasks = new List<(Guid, DateTime, Guid?, int)>
        {
            (Guid.NewGuid(), new DateTime(2026, 7, 1), deptId, 1),
            (Guid.NewGuid(), new DateTime(2026, 7, 10), deptId, 1),
            (Guid.NewGuid(), new DateTime(2026, 7, 15), deptId, 1)
        };

        var result = ApplyFilters(tasks,
            new DateTime(2026, 7, 5), new DateTime(2026, 7, 12), null, null);
        Assert.Single(result);
    }

    [Fact]
    public void DepartmentFilter_FiltersCorrectly()
    {
        var dept1 = Guid.NewGuid();
        var dept2 = Guid.NewGuid();
        var tasks = new List<(Guid, DateTime, Guid?, int)>
        {
            (Guid.NewGuid(), DateTime.UtcNow, dept1, 1),
            (Guid.NewGuid(), DateTime.UtcNow, dept2, 1),
            (Guid.NewGuid(), DateTime.UtcNow, dept1, 1)
        };

        var result = ApplyFilters(tasks, null, null, dept1, null);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void StatusFilter_FiltersCorrectly()
    {
        var deptId = Guid.NewGuid();
        var tasks = new List<(Guid, DateTime, Guid?, int)>
        {
            (Guid.NewGuid(), DateTime.UtcNow, deptId, 0),
            (Guid.NewGuid(), DateTime.UtcNow, deptId, 1),
            (Guid.NewGuid(), DateTime.UtcNow, deptId, 3)
        };

        var result = ApplyFilters(tasks, null, null, null, 1);
        Assert.Single(result);
    }

    [Fact]
    public void NoFilters_ReturnsAll()
    {
        var deptId = Guid.NewGuid();
        var tasks = new List<(Guid, DateTime, Guid?, int)>
        {
            (Guid.NewGuid(), DateTime.UtcNow, deptId, 0),
            (Guid.NewGuid(), DateTime.UtcNow, deptId, 1),
            (Guid.NewGuid(), DateTime.UtcNow, deptId, 3)
        };

        var result = ApplyFilters(tasks, null, null, null, null);
        Assert.Equal(3, result.Count);
    }
}
