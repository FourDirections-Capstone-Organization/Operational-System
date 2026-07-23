using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.TaskManagement;

namespace Backend.Modules.Analytics;

public class ChartDataService
{
    private readonly AppDbContext _db;
    private readonly IReportService _reportService;
    private readonly ILogger<ChartDataService> _logger;

    public ChartDataService(AppDbContext db, IReportService reportService, ILogger<ChartDataService> logger)
    {
        _db = db;
        _reportService = reportService;
        _logger = logger;
    }

    public async Task<ChartDataDTO> GetCompletionRateTrendAsync(int weeks = 4)
    {
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-7 * weeks);

        var completedTasks = await _db.Tasks
            .Where(t => t.Status == Models.Enums.TaskStatus.Completed
                && t.CreatedAt >= startDate
                && t.CreatedAt <= endDate)
            .ToListAsync();

        var labels = new List<string>();
        var onTimeData = new List<double>();
        var lateData = new List<double>();

        for (var w = 0; w < weeks; w++)
        {
            var weekStart = startDate.AddDays(w * 7);
            var weekEnd = weekStart.AddDays(7);
            var weekLabel = $"Week {ISOWeek.GetWeekOfYear(weekStart)}";

            var weekTasks = completedTasks
                .Where(t => t.CreatedAt >= weekStart && t.CreatedAt < weekEnd)
                .ToList();

            labels.Add(weekLabel);
            onTimeData.Add(weekTasks.Count(t => t.IsApproved == true));
            lateData.Add(weekTasks.Count(t => t.IsApproved == false));
        }

        return new ChartDataDTO
        {
            Labels = labels,
            Datasets = new List<ChartDatasetDTO>
            {
                new() { Label = "On-Time", Data = onTimeData, BackgroundColor = "#a6e3a1", BorderColor = "#a6e3a1" },
                new() { Label = "Late", Data = lateData, BackgroundColor = "#f38ba8", BorderColor = "#f38ba8" }
            }
        };
    }

    public async Task<List<TrendDataDTO>> GetPeriodOverPeriodAsync(int weeks = 4)
    {
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-7 * weeks);

        var completedTasks = await _db.Tasks
            .Where(t => t.Status == Models.Enums.TaskStatus.Completed
                && t.CreatedAt >= startDate
                && t.CreatedAt <= endDate)
            .ToListAsync();

        var trends = new List<TrendDataDTO>();

        for (var w = 0; w < weeks; w++)
        {
            var weekStart = startDate.AddDays(w * 7);
            var weekEnd = weekStart.AddDays(7);

            var weekTasks = completedTasks
                .Where(t => t.CreatedAt >= weekStart && t.CreatedAt < weekEnd)
                .ToList();

            var onTime = weekTasks.Count(t => t.IsApproved == true);
            var late = weekTasks.Count(t => t.IsApproved == false);
            var total = onTime + late;

            trends.Add(new TrendDataDTO
            {
                PeriodLabel = $"Week {ISOWeek.GetWeekOfYear(weekStart)}",
                OnTimeCount = onTime,
                LateCount = late,
                TotalCompleted = total,
                OnTimeRate = total > 0 ? Math.Round((double)onTime / total * 100, 2) : 0
            });
        }

        return trends;
    }

    public async Task<List<TrendDataDTO>> GetDepartmentTrendAsync(Guid departmentId, int weeks = 4)
    {
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-7 * weeks);

        var completedTasks = await _db.Tasks
            .Where(t => t.AssignedDepartmentId == departmentId
                && t.Status == Models.Enums.TaskStatus.Completed
                && t.CreatedAt >= startDate
                && t.CreatedAt <= endDate)
            .ToListAsync();

        var trends = new List<TrendDataDTO>();

        for (var w = 0; w < weeks; w++)
        {
            var weekStart = startDate.AddDays(w * 7);
            var weekEnd = weekStart.AddDays(7);

            var weekTasks = completedTasks
                .Where(t => t.CreatedAt >= weekStart && t.CreatedAt < weekEnd)
                .ToList();

            var onTime = weekTasks.Count(t => t.IsApproved == true);
            var late = weekTasks.Count(t => t.IsApproved == false);
            var total = onTime + late;

            trends.Add(new TrendDataDTO
            {
                PeriodLabel = $"Week {ISOWeek.GetWeekOfYear(weekStart)}",
                OnTimeCount = onTime,
                LateCount = late,
                TotalCompleted = total,
                OnTimeRate = total > 0 ? Math.Round((double)onTime / total * 100, 2) : 0
            });
        }

        return trends;
    }

    public ChartDataDTO TransformToChartData(List<TrendDataDTO> trends)
    {
        if (trends == null || trends.Count == 0)
            return new ChartDataDTO();

        return new ChartDataDTO
        {
            Labels = trends.Select(t => t.PeriodLabel).ToList(),
            Datasets = new List<ChartDatasetDTO>
            {
                new()
                {
                    Label = "On-Time",
                    Data = trends.Select(t => (double)t.OnTimeCount).ToList(),
                    BackgroundColor = "#a6e3a1",
                    BorderColor = "#a6e3a1"
                },
                new()
                {
                    Label = "Late",
                    Data = trends.Select(t => (double)t.LateCount).ToList(),
                    BackgroundColor = "#f38ba8",
                    BorderColor = "#f38ba8"
                }
            }
        };
    }
}
