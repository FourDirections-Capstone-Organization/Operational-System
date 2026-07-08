using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class JobPosition
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // Foreign key to Department
    public Guid DepartmentId { get; set; }

    // Nav Property - link to parent department
    public Department? Department { get; set; }
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Nav Property
    public ICollection<User> Users { get; set; } = new List<User>();
}
