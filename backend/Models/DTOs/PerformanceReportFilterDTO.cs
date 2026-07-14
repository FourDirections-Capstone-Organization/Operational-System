using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class PerformanceReportFilterDTO
{
    public ReportPeriod Period { get; set; }
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? EmployeeId { get; set; }
    public ExportFormat ExportFormat { get; set; }
}
