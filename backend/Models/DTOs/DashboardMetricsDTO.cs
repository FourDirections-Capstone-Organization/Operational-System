namespace Backend.Models.DTOs;

public class DashboardMetricsDTO
{
    public int TotalActiveTasks { get; set; }
    public int OverdueTaskCount { get; set; }
    public int NotStartedCount { get; set; }
    public int InProgressCount { get; set; }
    public int DonePendingReviewCount { get; set; }
    public int OnHoldCount { get; set; }
    public int CompletedTodayCount { get; set; }
    public List<WorkloadItemDTO> EmployeeWorkload { get; set; } = new();
    public List<DepartmentWorkloadDTO> DepartmentWorkload { get; set; } = new();
}

public class WorkloadItemDTO
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public int ActiveTaskCount { get; set; }
    public int OverdueTaskCount { get; set; }
    public AvailabilityStatusDTO AvailabilityStatus { get; set; } = new();
}

public class DepartmentWorkloadDTO
{
    public Guid DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public int TotalActiveTasks { get; set; }
    public int TotalOverdueTasks { get; set; }
    public int EmployeeCount { get; set; }
}

public class AvailabilityStatusDTO
{
    public string Status { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
}
