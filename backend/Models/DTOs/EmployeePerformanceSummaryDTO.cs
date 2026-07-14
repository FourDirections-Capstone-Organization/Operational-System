namespace Backend.Models.DTOs;

public class EmployeePerformanceSummaryDTO
{
    public Guid EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int TotalCompletedTasks { get; set; }
    public int OnTimeCount { get; set; }
    public int LateCount { get; set; }
    public double SlaComplianceRate { get; set; }
    public List<RecommendationSummaryDTO> Recommendations { get; set; } = new();
}

public class RecommendationSummaryDTO
{
    public Guid RecommendationId { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string CoordinatorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
