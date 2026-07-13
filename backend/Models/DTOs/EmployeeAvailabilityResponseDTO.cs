using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class EmployeeAvailabilityResponseDTO
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public AvailabilityStatus AvailabilityStatus { get; set; }
    public bool IsAvailable { get; set; }
}
