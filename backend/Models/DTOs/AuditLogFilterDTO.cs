using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class AuditLogFilterDTO
{
    public DateTime? DateRangeStart { get; set; }
    public DateTime? DateRangeEnd { get; set; }
    public Guid? UserId { get; set; }
    public AuditActionType? ActionType { get; set; }
    public string? Module { get; set; }
    public string? TargetEntity { get; set; }
}
