namespace Backend.Models.DTOs;

public class TaskCommentAttachmentDTO
{
    public Guid Id { get; set; }
    public Guid CommentId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? FileType { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class TaskCommentResponseDTO
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? AttachmentFileName { get; set; }
    public List<TaskCommentAttachmentDTO> Attachments { get; set; } = new();
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
