namespace Backend.Models.DTOs;

public class KpiFilterDTO
{
    public Guid? EmployeeId { get; set; }
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
}
