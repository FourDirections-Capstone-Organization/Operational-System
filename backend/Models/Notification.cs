using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Notification
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid RecipientId { get; set; }
    public User? Recipient { get; set; }

    public NotificationType Type { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    public Guid? RelatedTaskId { get; set; }
    public Task? RelatedTask { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}