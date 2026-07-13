namespace Backend.Models.DTOs;

public class DashboardFilterDTO
{
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
    public Guid? EmployeeId { get; set; }
    public Guid? DepartmentId { get; set; }
    public Backend.Models.Enums.TaskStatus? Status { get; set; }
}
