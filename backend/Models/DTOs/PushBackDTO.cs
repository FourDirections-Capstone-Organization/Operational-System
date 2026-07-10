using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class PushBackDTO
{
    [Required]
    [MaxLength(500)]
    public string Comment { get; set; } = string.Empty;
}