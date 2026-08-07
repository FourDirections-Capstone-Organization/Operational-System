using System.Text.Json.Serialization;
using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class PerformanceReportFilterDTO
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ReportPeriod Period { get; set; }
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
    public Guid? DepartmentId { get; set; }
    public Guid? EmployeeId { get; set; }
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ExportFormat ExportFormat { get; set; }
}
