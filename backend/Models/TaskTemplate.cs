using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models;

public class TaskTemplate
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(150)]
    public string TemplateName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string DefaultTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string DefaultDescription { get; set; } = string.Empty;

    public PriorityLevel DefaultPriorityLevel { get; set; }

    public TaskClassification DefaultClassification { get; set; } = TaskClassification.RoutineDailyTask;

    public AssignmentScope DefaultAssignmentScope { get; set; } = AssignmentScope.SingleEmployee;

    public Guid? DefaultAssigneeId { get; set; }
    public User? DefaultAssignee { get; set; }

    public Guid? DefaultDepartmentId { get; set; }
    public Department? DefaultDepartment { get; set; }

    public RecurrenceRule RecurrenceRule { get; set; }

    public DateTime RecurrenceStartDate { get; set; }

    public DateTime NextGenerationDate { get; set; }

    public DateTime? LastGeneratedDate { get; set; }

    public bool IsActive { get; set; } = true;

    public Guid CreatedById { get; set; }
    public User? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
