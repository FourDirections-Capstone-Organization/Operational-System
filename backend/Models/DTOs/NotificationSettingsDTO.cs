using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class NotificationSettingsDTO
{
    [Required]
    [Range(1, int.MaxValue, ErrorMessage = "Threshold value must be a positive number")]
    public int DeadlineWarningValue { get; set; }

    [Required]
    public DeadlineWarningUnit DeadlineWarningUnit { get; set; }
}