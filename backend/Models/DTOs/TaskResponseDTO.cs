using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class TaskResponseDTO
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public PriorityLevel PriorityLevel { get; set; }
    public TaskClassification Classification { get; set; }
    public Enums.TaskStatus Status { get; set; }
    public AssignmentScope AssignmentScope { get; set; }
    public DateTime Deadline { get; set; }
    public bool IsSLALocked { get; set; }
    public SlaRiskLevel SlaRiskLevel { get; set; }
    public bool IsConfidential { get; set; }
    public Guid CreatedById { get; set; }
    public string? CreatedByName { get; set; }
    public Guid? AssignedDepartmentId { get; set; }
    public string? AssignedDepartmentName { get; set; }
    public string? ProgressNotes { get; set; }
    public string? ReviewRemarks { get; set; }
    public string? PushBackComment { get; set; }
    public string? HoldReason { get; set; }
    public string? CancellationReason { get; set; }
    public bool? IsApproved { get; set; }
    public Enums.TaskStatus? PreviousStatus { get; set; }
    public DateTime? RevisedDeadline { get; set; }
    public DateTime? HeldAt { get; set; }
    public List<TaskAssigneeDTO> Assignees { get; set; } = new();
    public int AttachmentCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class TaskAssigneeDTO
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string EmployeeNumber { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? AvailabilityStatus { get; set; }
    public bool IsAvailable { get; set; }
    public string? Department { get; set; }
}