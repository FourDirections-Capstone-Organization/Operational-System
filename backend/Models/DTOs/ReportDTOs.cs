namespace Backend.Models.DTOs;

/// <summary>
/// Task Completion Report — counts assigned/completed/in-progress/pending-review/overdue
/// tasks within a date range, optionally filtered by employee, priority, status and category.
/// </summary>
public class TaskCompletionReportDTO
{
    public int TotalTasksAssigned { get; set; }
    public int TotalTasksCompleted { get; set; }
    public int TotalTasksInProgress { get; set; }
    public int TotalTasksPendingReview { get; set; }
    public int TotalOverdueTasks { get; set; }
    public double TaskCompletionRate { get; set; }
    public double AverageTaskCompletionTimeHours { get; set; }
    public List<TaskCompletionEmployeeSummaryDTO> EmployeePerformanceSummary { get; set; } = new();
}

public class TaskCompletionEmployeeSummaryDTO
{
    public string EmployeeName { get; set; } = string.Empty;
    public int TotalAssigned { get; set; }
    public int TotalCompleted { get; set; }
    public double CompletionRate { get; set; }
    public double AverageCompletionTimeHours { get; set; }
}

/// <summary>
/// Operational Summary Report — overall task workload and completion overview within a date
/// range, with workload grouped by category, department and priority.
/// </summary>
public class OperationalSummaryReportDTO
{
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int PendingTasks { get; set; }
    public int OverdueTasks { get; set; }
    public double TaskCompletionRate { get; set; }
    public List<OperationalEmployeePerformanceDTO> EmployeePerformanceSummary { get; set; } = new();
    public List<ReportWorkloadItemDTO> WorkloadByCategory { get; set; } = new();
    public List<ReportWorkloadItemDTO> WorkloadByDepartment { get; set; } = new();
    public List<ReportWorkloadItemDTO> WorkloadByPriority { get; set; } = new();
}

public class OperationalEmployeePerformanceDTO
{
    public string EmployeeName { get; set; } = string.Empty;
    public int Assigned { get; set; }
    public int Completed { get; set; }
    public int Overdue { get; set; }
    public double CompletionRate { get; set; }
}

public class ReportWorkloadItemDTO
{
    public string CategoryName { get; set; } = string.Empty;
    public int TaskCount { get; set; }
    public double Percentage { get; set; }
}

/// <summary>
/// Filter dropdown options for the reports (departments and employees).
/// </summary>
public class ReportFilterOptionsDTO
{
    public List<ReportFilterOptionDTO> Departments { get; set; } = new();
    public List<ReportFilterOptionDTO> Employees { get; set; } = new();
}

public class ReportFilterOptionDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
