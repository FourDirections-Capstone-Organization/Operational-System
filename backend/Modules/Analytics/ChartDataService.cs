using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models.DTOs;

namespace Backend.Modules.Analytics;

public class ChartDataService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ChartDataService> _logger;

    public ChartDataService(AppDbContext db, ILogger<ChartDataService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<ChartDataDTO> GetCompletionRateTrendAsync(int weeks = 4)
    {
        var endDate = DateTime.UtcNow.Date;
        var startDate = endDate.AddDays(-7 * weeks);

        var completedTasks = await _db.Tasks
            .Where(t => t.Status == Backend.Models.Enums.TaskStatus.Completed
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
}
