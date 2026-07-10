namespace Backend.Models;

public class TaskAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TaskId { get; set; }
    public Task? Task { get; set; }

    public Guid AssignedUserId { get; set; }
    public User? AssignedUser { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}