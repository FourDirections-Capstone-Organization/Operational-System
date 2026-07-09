using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class ResetPasswordDTO
{
    [Required]
    public string Token { get; set; } = string.Empty;

    [Required]
    [MinLength(15, ErrorMessage = "Password must be at least 15 characters (OWASP: uppercase, lowercase, number, special character)")]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match")]
    public string ConfirmPassword { get; set; } = string.Empty;
}