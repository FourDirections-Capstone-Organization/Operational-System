namespace Backend.Models;

public class TaskAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TaskId { get; set; }
    public Task? Task { get; set; }

    public Guid AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    /// <summary>
    /// Percentage of the task completed as reported by this assignee (0-100).
    /// Visible to Coordinators and Managers in the Task Details.
    /// </summary>
    public int CompletionPercentage { get; set; } = 0;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}