using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class LoginDTO
{
    [Required]
    public string Identifier { get; set; } = string.Empty; // Can be Employee ID, Email, or Username

    [Required]
    public string Password { get; set; } = string.Empty;
}
