using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class RecommendationResponseDTO
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string? TaskTitle { get; set; }
    public Guid AssigneeId { get; set; }
    public string? AssigneeName { get; set; }
    public Guid CoordinatorId { get; set; }
    public string? CoordinatorName { get; set; }
    public RecommendationCategory Category { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
