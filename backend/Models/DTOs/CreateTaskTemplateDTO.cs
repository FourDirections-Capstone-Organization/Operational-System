using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class CreateTaskTemplateDTO
{
    [Required]
    [MaxLength(150)]
    public string TemplateName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string DefaultTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string DefaultDescription { get; set; } = string.Empty;

    [Required]
    public PriorityLevel DefaultPriorityLevel { get; set; }

    [Required]
    public TaskClassification DefaultClassification { get; set; }

    public AssignmentScope DefaultAssignmentScope { get; set; } = AssignmentScope.SingleEmployee;

    public Guid? DefaultAssigneeId { get; set; }

    public Guid? DefaultDepartmentId { get; set; }

    [Required]
    public RecurrenceRule RecurrenceRule { get; set; }

    [Required]
    public DateTime RecurrenceStartDate { get; set; }

    public bool IsActive { get; set; } = true;
}
