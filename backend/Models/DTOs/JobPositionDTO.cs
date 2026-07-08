using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class CreateJobPositionDTO
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid DepartmentId { get; set; }
}

public class UpdateJobPositionDTO
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public Guid DepartmentId { get; set; }
}

public class JobPositionResponseDTO
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int UserCount { get; set; }
}
