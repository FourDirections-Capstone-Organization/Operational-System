using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class PlaceOnHoldDTO
{
    [Required]
    [MaxLength(500)]
    public string HoldReason { get; set; } = string.Empty;
}