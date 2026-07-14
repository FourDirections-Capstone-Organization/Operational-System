using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models;

public class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public AuditActionType ActionType { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Required]
    [MaxLength(100)]
    public string TargetEntity { get; set; } = string.Empty;

    public Guid? TargetEntityId { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public string? OldValue { get; set; }

    public string? NewValue { get; set; }

    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Module { get; set; } = string.Empty;
}
