using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class CreateAnnouncementDTO
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(5000)]
    public string Content { get; set; } = string.Empty;

    public string? TargetRoles { get; set; }

    [Required]
    public DateTime EffectiveDate { get; set; }

    public DateTime? ExpiryDate { get; set; }
}

public class AnnouncementResponseDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? TargetRoles { get; set; }
    public DateTime EffectiveDate { get; set; }
    public DateTime? ExpiryDate { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public string CreatedByRole { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsAcknowledged { get; set; }
    public int AcknowledgmentCount { get; set; }
    public List<AcknowledgmentUserDTO> Acknowledgments { get; set; } = new();
    public List<CommentDTO> Comments { get; set; } = new();
}

public class AcknowledgmentUserDTO
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateTime AcknowledgedAt { get; set; }
}

public class CommentDTO
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AddCommentDTO
{
    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;
}
