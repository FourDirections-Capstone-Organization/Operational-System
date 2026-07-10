using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class CancelTaskDTO
{
    [Required]
    [MaxLength(500)]
    public string CancellationReason { get; set; } = string.Empty;

    [Required]
    public bool IsConfirmed { get; set; }
}