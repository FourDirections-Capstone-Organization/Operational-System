namespace Backend.Models.DTOs;

public class KpiTrackingDTO
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int TotalCompletedTasks { get; set; }
    public int TotalOnTimeTasks { get; set; }
    public int TotalLateTasks { get; set; }
    public double OverallOnTimeRate { get; set; }
    public double OverallLateRate { get; set; }
    public List<EmployeeKpiDTO> EmployeeKpis { get; set; } = new();
}

public class EmployeeKpiDTO
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public int TotalCompleted { get; set; }
    public int OnTimeCount { get; set; }
    public int LateCount { get; set; }
    public double OnTimeRate { get; set; }
    public double LateRate { get; set; }
}
