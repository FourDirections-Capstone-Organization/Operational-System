using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Department
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow();
    public DateTime? UpdatedAt { get; set; }

    // Nav Properties
    public ICollection<JobPosition> JobPositions { get; set; } = new List<JobPosition>();
    public ICollection<User> Users { get; set; } = new List<User>();

}
