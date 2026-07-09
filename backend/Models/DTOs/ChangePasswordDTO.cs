using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class ChangePasswordDTO
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(15, ErrorMessage = "New password must be at least 15 characters")]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    [Compare("NewPassword", ErrorMessage = "Passwords do not match")]
    public string ConfirmPassword { get; set; } = string.Empty;
}