using System.ComponentModel.DataAnnotations;

namespace Backend.Models.DTOs;

public class TransferUserDTO
{
    [Required]
    public Guid NewDepartmentId { get; set; }
    
    [Required]
    public Guid NewJobPositionId { get; set; }
}
