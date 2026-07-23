namespace Backend.Models.DTOs;

public class DepartmentKpiDTO
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int TotalEmployees { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OnTimeTasks { get; set; }
    public int LateTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int ActiveTasks { get; set; }
    public double OnTimeRate { get; set; }
    public double CompletionRate { get; set; }
    public double AvgCompletionTimeHours { get; set; }
    public List<EmployeeKpiSummaryDTO> EmployeeSummaries { get; set; } = new();
}

public class EmployeeKpiSummaryDTO
{
    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int CompletedTasks { get; set; }
    public int OnTimeTasks { get; set; }
    public int LateTasks { get; set; }
    public int ActiveTasks { get; set; }
    public double OnTimeRate { get; set; }
}
