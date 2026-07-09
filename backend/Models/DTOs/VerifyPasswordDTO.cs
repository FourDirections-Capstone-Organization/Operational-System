using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class VerifyPasswordDTO
{
    [Required]
    public string EmployeeID { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}