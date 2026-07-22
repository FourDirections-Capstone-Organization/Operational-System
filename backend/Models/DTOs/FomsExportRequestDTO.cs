namespace Backend.Models.DTOs;

public class FomsExportRequestDTO
{
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
    public Guid? EmployeeId { get; set; }
}
