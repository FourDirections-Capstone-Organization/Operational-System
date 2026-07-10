using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class ReviewTaskDTO
{
    [Required]
    public bool IsApproved { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}