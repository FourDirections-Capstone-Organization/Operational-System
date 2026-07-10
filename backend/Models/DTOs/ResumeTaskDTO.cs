using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class ResumeTaskDTO
{
    [Required]
    public DateTime RevisedDeadline { get; set; }
}