using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class TaskComment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TaskId { get; set; }
    public Task? Task { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? AttachmentFilePath { get; set; }

    [MaxLength(255)]
    public string? AttachmentFileName { get; set; }

    /// <summary>
    /// Files attached to this comment. Supports one or more files per comment.
    /// </summary>
    public ICollection<TaskCommentAttachment>? Attachments { get; set; }

    public bool IsDeleted { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
