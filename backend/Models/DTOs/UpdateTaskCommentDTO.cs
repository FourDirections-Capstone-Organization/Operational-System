using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class UpdateTaskCommentDTO
{
    [Required]
    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;
}
