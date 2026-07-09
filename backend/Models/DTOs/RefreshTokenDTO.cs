using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class RefreshTokenDTO
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}