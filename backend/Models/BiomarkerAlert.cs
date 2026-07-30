namespace Backend.Models;

public class BiomarkerAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime ScanDateTime { get; set; }
    public DateTime ScanDate { get; set; }
    public Guid? DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string? EmployeeName { get; set; }
    public string? EmployeeNumber { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public double CurrentValue { get; set; }
    public double ThresholdValue { get; set; }
    public string Severity { get; set; } = "Info";
    public string Description { get; set; } = string.Empty;
    public bool IsAcknowledged { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
