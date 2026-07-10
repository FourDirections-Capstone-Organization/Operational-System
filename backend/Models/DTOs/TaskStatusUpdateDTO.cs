using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class TaskStatusUpdateDTO
{
    [Required]
    public Enums.TaskStatus NewStatus { get; set; }

    [MaxLength(1000)]
    public string? ProgressNotes { get; set; }
}