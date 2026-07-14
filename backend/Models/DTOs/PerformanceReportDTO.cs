using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class PerformanceReportDTO
{
    public ReportPeriod Period { get; set; }
    public DateTime DateRangeStart { get; set; }
    public DateTime DateRangeEnd { get; set; }
    public string? DepartmentName { get; set; }
    public string? EmployeeName { get; set; }
    public int TotalCompletedTasks { get; set; }
    public double OverallOnTimeRate { get; set; }
    public double OverallLateRate { get; set; }
    public List<EmployeePerformanceDTO> EmployeeBreakdown { get; set; } = new();
}

public class EmployeePerformanceDTO
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int TotalCompleted { get; set; }
    public int OnTimeCount { get; set; }
    public int LateCount { get; set; }
    public double OnTimeRate { get; set; }
    public double LateRate { get; set; }
}
