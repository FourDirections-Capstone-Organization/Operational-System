using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class AnnouncementComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AnnouncementId { get; set; }
    public Announcement? Announcement { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }

    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
