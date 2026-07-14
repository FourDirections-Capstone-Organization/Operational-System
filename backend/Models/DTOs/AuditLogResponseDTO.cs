namespace Backend.Models.DTOs;

public class AuditLogResponseDTO
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? ActorName { get; set; }
    public string? ActorRole { get; set; }
    public string ActionType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string TargetEntity { get; set; } = string.Empty;
    public Guid? TargetEntityId { get; set; }
    public string? IpAddress { get; set; }
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
}
