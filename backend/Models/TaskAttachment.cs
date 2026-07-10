using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class TaskAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TaskId { get; set; }
    public Task? Task { get; set; }

    [Required]
    [MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;

    public long FileSize { get; set; }

    [MaxLength(20)]
    public string FileType { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Description { get; set; }

    public Guid UploadedById { get; set; }
    public User? UploadedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}