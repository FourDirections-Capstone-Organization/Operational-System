using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class ForgotPasswordDTO
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}