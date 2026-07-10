using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class TaskTemplateResponseDTO
{
    public Guid Id { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public string DefaultTitle { get; set; } = string.Empty;
    public string DefaultDescription { get; set; } = string.Empty;
    public PriorityLevel DefaultPriorityLevel { get; set; }
    public TaskClassification DefaultClassification { get; set; }
    public AssignmentScope DefaultAssignmentScope { get; set; }
    public Guid? DefaultAssigneeId { get; set; }
    public string? DefaultAssigneeName { get; set; }
    public Guid? DefaultDepartmentId { get; set; }
    public string? DefaultDepartmentName { get; set; }
    public RecurrenceRule RecurrenceRule { get; set; }
    public DateTime RecurrenceStartDate { get; set; }
    public DateTime NextGenerationDate { get; set; }
    public DateTime? LastGeneratedDate { get; set; }
    public bool IsActive { get; set; }
    public Guid CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public DateTime CreatedAt { get; set; }
}
