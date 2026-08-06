using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class TaskProgressUpdateDTO
{
    /// <summary>
    /// Percentage of the task completed as reported by the assignee (0-100).
    /// </summary>
    [Range(0, 100)]
    public int CompletionPercentage { get; set; }
}
