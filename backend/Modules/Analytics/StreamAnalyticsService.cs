using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models.DTOs;
using Backend.Modules.TaskManagement;

namespace Backend.Modules.Analytics;

public class StreamAnalyticsService : IStreamAnalyticsService
{
    private readonly AppDbContext _db;
    private readonly IDashboardService _dashboardFallback;
    private readonly ILogger<StreamAnalyticsService> _logger;
    private static readonly HttpClient _httpClient = new();
    private static readonly string KsqlDbUrl = "http://ksqldb:8088";
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
    private bool _ksqlDbAvailable = true;

    public StreamAnalyticsService(AppDbContext db, IDashboardService dashboardFallback, ILogger<StreamAnalyticsService> logger)
    {
        _db = db;
        _dashboardFallback = dashboardFallback;
        _logger = logger;
    }

    public async Task<DepartmentStreamMetricsDTO> GetDepartmentCompletionRateAsync(Guid departmentId)
    {
        if (_ksqlDbAvailable)
        {
            try
            {
                return await QueryKsqlDbAsync(departmentId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ksqlDB query failed, falling back to DashboardService");
                _ksqlDbAvailable = false;
            }
        }

        return await FallbackToDashboardAsync(departmentId);
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

        var alerts = await query
            .GroupBy(t => t.AssignedDepartmentId)
            .Select(g => new OverdueAlertDTO
            {
                DepartmentId = g.Key ?? Guid.Empty,
                OverdueCount = g.Count(),
                TaskTitles = g.Select(t => t.Title).ToList(),
                WindowStart = now.AddMinutes(-15)
            })
            .ToListAsync();

        foreach (var alert in alerts)
        {
            var dept = await _db.Departments.FindAsync(alert.DepartmentId);
            alert.DepartmentName = dept?.Name ?? "Unknown";
        }

        return alerts;
    }

    public async Task<WorkloadStreamDTO> GetLiveWorkloadAsync(Guid departmentId)
    {
        var activeTasks = await _db.Tasks
            .Include(t => t.Assignments)
            .Where(t => t.AssignedDepartmentId == departmentId
                && t.Status != Backend.Models.Enums.TaskStatus.Completed
                && t.Status != Backend.Models.Enums.TaskStatus.Cancelled)
            .ToListAsync();

        var employeeIds = activeTasks
            .SelectMany(t => t.Assignments)
            .Select(a => a.AssignedUserId)
            .Distinct()
            .Count();

        var dept = await _db.Departments.FindAsync(departmentId);

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

    private async Task<DepartmentStreamMetricsDTO> QueryKsqlDbAsync(Guid departmentId)
    {
        var ksql = $"SELECT * FROM dept_completion_rate WHERE department_id = '{departmentId}';";
        var payload = JsonSerializer.Serialize(new { ksql, streamsProperties = new { } });
        var content = new StringContent(payload, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{KsqlDbUrl}/query", content);
        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();

        if (string.IsNullOrWhiteSpace(json))
            throw new InvalidOperationException("Empty response from ksqlDB");

        var rows = JsonSerializer.Deserialize<List<JsonElement>>(json, JsonOptions);
        var dept = await _db.Departments.FindAsync(departmentId);

        if (rows == null || rows.Count == 0)
        {
            return new DepartmentStreamMetricsDTO
            {
                DepartmentId = departmentId,
                DepartmentName = dept?.Name ?? "Unknown",
                LastUpdated = DateTime.UtcNow
            };
        }

        var firstRow = rows[0];
        return new DepartmentStreamMetricsDTO
        {
            DepartmentId = departmentId,
            DepartmentName = dept?.Name ?? "Unknown",
            CompletedLastHour = firstRow.TryGetProperty("COMPLETED_COUNT", out var c) ? c.GetInt32() : 0,
            TotalLastHour = firstRow.TryGetProperty("TOTAL_COUNT", out var t) ? t.GetInt32() : 0,
            CompletionRate = firstRow.TryGetProperty("COMPLETION_RATE", out var r) ? r.GetDouble() : 0,
            LastUpdated = DateTime.UtcNow
        };
    }

    private async Task<DepartmentStreamMetricsDTO> FallbackToDashboardAsync(Guid departmentId)
    {
        var dept = await _db.Departments.FindAsync(departmentId);
        var activeTasks = await _db.Tasks
            .CountAsync(t => t.AssignedDepartmentId == departmentId
                && t.Status != Backend.Models.Enums.TaskStatus.Completed
                && t.Status != Backend.Models.Enums.TaskStatus.Cancelled);

        var lastHour = DateTime.UtcNow.AddHours(-1);
        var completedLastHour = await _db.Tasks
            .CountAsync(t => t.AssignedDepartmentId == departmentId
                && t.Status == Backend.Models.Enums.TaskStatus.Completed
                && t.UpdatedAt >= lastHour);

        var totalLastHour = await _db.Tasks
            .CountAsync(t => t.AssignedDepartmentId == departmentId
                && t.UpdatedAt >= lastHour);

        return new DepartmentStreamMetricsDTO
        {
            DepartmentId = departmentId,
            DepartmentName = dept?.Name ?? "Unknown",
            ActiveTasks = activeTasks,
            CompletedLastHour = completedLastHour,
            TotalLastHour = totalLastHour,
            CompletionRate = totalLastHour > 0
                ? Math.Round((double)completedLastHour / totalLastHour * 100, 2)
                : 0,
            LastUpdated = DateTime.UtcNow
        };
    }
}
