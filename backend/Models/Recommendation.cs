using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models;

public class Recommendation
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TaskId { get; set; }
    public Task? Task { get; set; }

    public Guid AssigneeId { get; set; }
    public User? Assignee { get; set; }

    public Guid CoordinatorId { get; set; }
    public User? Coordinator { get; set; }

    public RecommendationCategory Category { get; set; }

    [Required]
    [MaxLength(1000)]
    public string Notes { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
