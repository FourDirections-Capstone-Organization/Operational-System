using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class CreateRecommendationDTO
{
    [Required]
    public RecommendationCategory Category { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Notes { get; set; } = string.Empty;
}
