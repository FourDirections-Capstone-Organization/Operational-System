using Backend.Models.Enums;

namespace Backend.Models;

public class NotificationSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int DeadlineWarningValue { get; set; } = 2;

    public DeadlineWarningUnit DeadlineWarningUnit { get; set; } = DeadlineWarningUnit.Days;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}