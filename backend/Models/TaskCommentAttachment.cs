using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class TaskCommentAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CommentId { get; set; }
    public TaskComment? Comment { get; set; }

    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    public long FileSize { get; set; }

    [MaxLength(50)]
    public string? FileType { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
