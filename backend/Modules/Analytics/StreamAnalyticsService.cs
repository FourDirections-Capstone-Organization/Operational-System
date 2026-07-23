using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models.DTOs;

namespace Backend.Modules.Analytics;

public class StreamAnalyticsService : IStreamAnalyticsService
{
    private readonly AppDbContext _db;
    private readonly ILogger<StreamAnalyticsService> _logger;
    private static readonly HttpClient _httpClient = new();

    public StreamAnalyticsService(AppDbContext db, ILogger<StreamAnalyticsService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<DepartmentStreamMetricsDTO> GetDepartmentCompletionRateAsync(Guid departmentId)
    {
        var dept = await _db.Departments.FindAsync(departmentId);
        var activeTasks = await _db.Tasks
            .CountAsync(t => t.AssignedDepartmentId == departmentId
                && t.Status != Backend.Models.Enums.TaskStatus.Completed
                && t.Status != Backend.Models.Enums.TaskStatus.Cancelled);

        return new DepartmentStreamMetricsDTO
        {
            DepartmentId = departmentId,
            DepartmentName = dept?.Name ?? "Unknown",
            ActiveTasks = activeTasks,
            LastUpdated = DateTime.UtcNow
        };
    }

    public async Task<List<OverdueAlertDTO>> GetOverdueAlertsAsync(Guid? departmentId = null)
    {
        var now = DateTime.UtcNow;
        var query = _db.Tasks
            .Where(t => (t.RevisedDeadline ?? t.Deadline) < now
                && t.Status != Backend.Models.Enums.TaskStatus.Completed
                && t.Status != Backend.Models.Enums.TaskStatus.Cancelled);

        if (departmentId.HasValue)
            query = query.Where(t => t.AssignedDepartmentId == departmentId.Value);

        var tasks = await query
            .GroupBy(t => t.AssignedDepartmentId)
            .Select(g => new OverdueAlertDTO
            {
                DepartmentId = g.Key ?? Guid.Empty,
                OverdueCount = g.Count(),
                TaskTitles = g.Select(t => t.Title).ToList(),
                WindowStart = now.AddHours(-1)
            })
            .ToListAsync();

        foreach (var alert in tasks)
        {
            var dept = await _db.Departments.FindAsync(alert.DepartmentId);
            alert.DepartmentName = dept?.Name ?? "Unknown";
        }

        return tasks;
    }

    public async Task<WorkloadStreamDTO> GetLiveWorkloadAsync(Guid departmentId)
    {
        var activeTasks = await _db.Tasks
            .Where(t => t.AssignedDepartmentId == departmentId
                && t.Status != Backend.Models.Enums.TaskStatus.Completed
                && t.Status != Backend.Models.Enums.TaskStatus.Cancelled)
            .ToListAsync();

        var employeeIds = activeTasks
            .SelectMany(t => t.Assignments)
            .Select(a => a.AssignedUserId)
            .Distinct()
            .Count();

        return new WorkloadStreamDTO
        {
            DepartmentId = departmentId,
            ActiveTaskCount = activeTasks.Count,
            DistinctEmployeesAssigned = employeeIds,
            AvgTasksPerEmployee = employeeIds > 0
                ? Math.Round((double)activeTasks.Count / employeeIds, 2)
                : 0,
            LastUpdated = DateTime.UtcNow
        };
    }
}
