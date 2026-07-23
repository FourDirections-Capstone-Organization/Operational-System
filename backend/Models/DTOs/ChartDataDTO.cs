namespace Backend.Models.DTOs;

public class ChartDataDTO
{
    public List<string> Labels { get; set; } = new();
    public List<ChartDatasetDTO> Datasets { get; set; } = new();
}

public class ChartDatasetDTO
{
    public string Label { get; set; } = string.Empty;
    public List<double> Data { get; set; } = new();
    public string BackgroundColor { get; set; } = string.Empty;
    public string BorderColor { get; set; } = string.Empty;
}

public class DepartmentStreamMetricsDTO
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int CompletedLastHour { get; set; }
    public int TotalLastHour { get; set; }
    public double CompletionRate { get; set; }
    public int OverdueCount { get; set; }
    public int ActiveTasks { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class OverdueAlertDTO
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int OverdueCount { get; set; }
    public List<string> TaskTitles { get; set; } = new();
    public DateTime WindowStart { get; set; }
}

public class WorkloadStreamDTO
{
    public Guid DepartmentId { get; set; }
    public int ActiveTaskCount { get; set; }
    public int DistinctEmployeesAssigned { get; set; }
    public double AvgTasksPerEmployee { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class TrendDataDTO
{
    public string PeriodLabel { get; set; } = string.Empty;
    public int OnTimeCount { get; set; }
    public int LateCount { get; set; }
    public int TotalCompleted { get; set; }
    public double OnTimeRate { get; set; }
}
