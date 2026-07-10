namespace Backend.Models.DTOs;

public class NotificationResponseDTO
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public Guid? RelatedTaskId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}