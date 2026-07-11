using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public class TaskWorkflowService : ITaskWorkflowService
{
    private readonly AppDbContext _db;

    public TaskWorkflowService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> UpdateStatusAsync(
        Guid taskId, TaskStatusUpdateDTO dto, Guid userId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var user = await _db.Users.FindAsync(userId);
        if (user is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("User not found");

        var currentStatus = task.Status;
        var newStatus = dto.NewStatus;

        var transitionCheck = ValidateTransition(currentStatus, newStatus, user, task, userId);
        if (!transitionCheck.IsValid)
            return ApiResponseDTO<TaskResponseDTO>.Failure(transitionCheck.ErrorMessage!);

        task.Status = newStatus;
        if (!string.IsNullOrWhiteSpace(dto.ProgressNotes))
            task.ProgressNotes = dto.ProgressNotes.Trim();
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task status updated successfully");
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> PushBackAsync(
        Guid taskId, PushBackDTO dto, Guid coordinatorId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var coordinator = await _db.Users.FindAsync(coordinatorId);
        if (coordinator is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("User not found");

        if (coordinator.Role != UserRole.Coordinator)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Only Coordinators can push back tasks");

        if (task.Status != Models.Enums.TaskStatus.DonePendingReview)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Only tasks in Done/Pending Review status may be pushed back");

        if (string.IsNullOrWhiteSpace(dto.Comment))
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "A comment is required to push back a task");

        task.Status = Models.Enums.TaskStatus.InProgress;
        task.PushBackComment = dto.Comment.Trim();
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task pushed back to In Progress successfully");
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> ReviewTaskAsync(
        Guid taskId, ReviewTaskDTO dto, Guid reviewerId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var reviewer = await _db.Users.FindAsync(reviewerId);
        if (reviewer is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("User not found");

        if (reviewer.Role != UserRole.Coordinator && reviewer.Role != UserRole.Manager)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Only Coordinators and Managers can review tasks");

        if (task.Status != Models.Enums.TaskStatus.DonePendingReview)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Only tasks in Done/Pending Review status can be reviewed");

        if (dto.IsApproved)
        {
            task.Status = Models.Enums.TaskStatus.Completed;
            task.IsApproved = true;
            if (!string.IsNullOrWhiteSpace(dto.Remarks))
                task.ReviewRemarks = dto.Remarks.Trim();
            task.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return ApiResponseDTO<TaskResponseDTO>.Success(
                await MapToResponseDTOAsync(task),
                "Task approved and officially closed");
        }
        else
        {
            if (string.IsNullOrWhiteSpace(dto.Remarks))
                return ApiResponseDTO<TaskResponseDTO>.Failure(
                    "Remarks are required when returning a task for rework");

            task.Status = Models.Enums.TaskStatus.InProgress;
            task.IsApproved = false;
            task.ReviewRemarks = dto.Remarks.Trim();
            task.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return ApiResponseDTO<TaskResponseDTO>.Success(
                await MapToResponseDTOAsync(task),
                "Task returned for rework");
        }
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> PlaceOnHoldAsync(
        Guid taskId, PlaceOnHoldDTO dto, Guid coordinatorId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var coordinator = await _db.Users.FindAsync(coordinatorId);
        if (coordinator is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("User not found");

        if (coordinator.Role != UserRole.Coordinator)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Only Coordinators can place tasks on hold");

        if (task.Status != Models.Enums.TaskStatus.NotStarted && task.Status != Models.Enums.TaskStatus.InProgress)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Only tasks in Not Started or In Progress status can be placed on hold");

        if (string.IsNullOrWhiteSpace(dto.HoldReason))
            return ApiResponseDTO<TaskResponseDTO>.Failure("Hold reason is required");

        task.PreviousStatus = task.Status;
        task.Status = Models.Enums.TaskStatus.OnHold;
        task.HoldReason = dto.HoldReason.Trim();
        task.HeldAt = DateTime.UtcNow;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task placed on hold successfully");
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> ResumeTaskAsync(
        Guid taskId, ResumeTaskDTO dto, Guid coordinatorId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var coordinator = await _db.Users.FindAsync(coordinatorId);
        if (coordinator is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("User not found");

        if (coordinator.Role != UserRole.Coordinator)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Only Coordinators can resume tasks");

        if (task.Status != Models.Enums.TaskStatus.OnHold)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Only tasks in On Hold status can be resumed");

        if (dto.RevisedDeadline <= DateTime.UtcNow)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Revised deadline is required and must be a future date/time");

        if (!task.PreviousStatus.HasValue)
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Cannot resume task: previous status not recorded");

        task.Status = task.PreviousStatus.Value;
        task.RevisedDeadline = dto.RevisedDeadline;
        task.Deadline = dto.RevisedDeadline;
        task.PreviousStatus = null;
        task.HoldReason = null;
        task.HeldAt = null;
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task resumed successfully");
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> CancelTaskAsync(
        Guid taskId, CancelTaskDTO dto, Guid coordinatorId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var coordinator = await _db.Users.FindAsync(coordinatorId);
        if (coordinator is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("User not found");

        if (coordinator.Role != UserRole.Coordinator)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Only Coordinators can cancel tasks");

        if (task.Status == Models.Enums.TaskStatus.Completed)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Completed tasks cannot be cancelled");

        if (task.Status == Models.Enums.TaskStatus.Cancelled)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task is already cancelled");

        var activeStatuses = new[] { Models.Enums.TaskStatus.NotStarted, Models.Enums.TaskStatus.InProgress, Models.Enums.TaskStatus.OnHold };
        if (!activeStatuses.Contains(task.Status))
            return ApiResponseDTO<TaskResponseDTO>.Failure(
                "Only active tasks (Not Started, In Progress, or On Hold) can be cancelled");

        if (string.IsNullOrWhiteSpace(dto.CancellationReason))
            return ApiResponseDTO<TaskResponseDTO>.Failure("Cancellation reason is required");

        if (!dto.IsConfirmed)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Cancellation must be confirmed");

        task.Status = Models.Enums.TaskStatus.Cancelled;
        task.CancellationReason = dto.CancellationReason.Trim();
        task.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task cancelled successfully");
    }

    private (bool IsValid, string? ErrorMessage) ValidateTransition(
        Models.Enums.TaskStatus currentStatus, Models.Enums.TaskStatus newStatus, User user, Models.Task task, Guid userId)
    {
        if (currentStatus == Models.Enums.TaskStatus.Completed)
            return (false, "Completed tasks cannot be modified");

        if (currentStatus == Models.Enums.TaskStatus.Cancelled)
            return (false, "Cancelled tasks cannot be modified");

        if (currentStatus == Models.Enums.TaskStatus.OnHold)
            return (false, "On Hold tasks must be resumed before status changes");

        var allowedTransitions = new Dictionary<(Models.Enums.TaskStatus, UserRole), Models.Enums.TaskStatus[]>
        {
            { (Models.Enums.TaskStatus.NotStarted, UserRole.Dispatcher), new[] { Models.Enums.TaskStatus.InProgress } },
            { (Models.Enums.TaskStatus.NotStarted, UserRole.Encoder), new[] { Models.Enums.TaskStatus.InProgress } },
            { (Models.Enums.TaskStatus.NotStarted, UserRole.Courier), new[] { Models.Enums.TaskStatus.InProgress } },
            { (Models.Enums.TaskStatus.NotStarted, UserRole.Accountant), new[] { Models.Enums.TaskStatus.InProgress } },

            { (Models.Enums.TaskStatus.InProgress, UserRole.Dispatcher), new[] { Models.Enums.TaskStatus.DonePendingReview } },
            { (Models.Enums.TaskStatus.InProgress, UserRole.Encoder), new[] { Models.Enums.TaskStatus.DonePendingReview } },
            { (Models.Enums.TaskStatus.InProgress, UserRole.Courier), new[] { Models.Enums.TaskStatus.DonePendingReview } },
            { (Models.Enums.TaskStatus.InProgress, UserRole.Accountant), new[] { Models.Enums.TaskStatus.DonePendingReview } },

            { (Models.Enums.TaskStatus.DonePendingReview, UserRole.Coordinator), new[] { Models.Enums.TaskStatus.Completed } },
            { (Models.Enums.TaskStatus.DonePendingReview, UserRole.Manager), new[] { Models.Enums.TaskStatus.Completed } },
        };

        var key = (currentStatus, user.Role);
        if (!allowedTransitions.ContainsKey(key))
        {
            return (false, $"Invalid status transition from {currentStatus} for role {user.Role}");
        }

        var allowedNextStates = allowedTransitions[key];
        if (!allowedNextStates.Contains(newStatus))
        {
            return (false, $"Status sequence violation - cannot transition from {currentStatus} to {newStatus}");
        }

        if (currentStatus == Models.Enums.TaskStatus.NotStarted || currentStatus == Models.Enums.TaskStatus.InProgress)
        {
            var isAssigned = task.Assignments.Any(a => a.AssignedUserId == userId);
            if (!isAssigned)
                return (false, "You are not the assigned employee for this task");
        }

        return (true, null);
    }

    private async Task<TaskResponseDTO> MapToResponseDTOAsync(Models.Task task)
    {
        await _db.Entry(task).Reference(t => t.CreatedBy).LoadAsync();
        await _db.Entry(task).Reference(t => t.AssignedDepartment).LoadAsync();
        await _db.Entry(task).Collection(t => t.Assignments).LoadAsync();

        foreach (var assignment in task.Assignments)
        {
            await _db.Entry(assignment).Reference(a => a.AssignedUser).LoadAsync();
        }

        return new TaskResponseDTO
        {
            Id = task.Id,
            Title = task.Title,
            Description = task.Description,
            PriorityLevel = task.PriorityLevel,
            Classification = task.Classification,
            Status = task.Status,
            AssignmentScope = task.AssignmentScope,
            Deadline = task.Deadline,
            IsSLALocked = task.IsSLALocked,
            IsConfidential = task.IsConfidential,
            CreatedById = task.CreatedById,
            CreatedByName = task.CreatedBy is not null
                ? $"{task.CreatedBy.FirstName} {task.CreatedBy.LastName}".Trim()
                : null,
            AssignedDepartmentId = task.AssignedDepartmentId,
            AssignedDepartmentName = task.AssignedDepartment?.Name,
            ProgressNotes = task.ProgressNotes,
            ReviewRemarks = task.ReviewRemarks,
            PushBackComment = task.PushBackComment,
            HoldReason = task.HoldReason,
            CancellationReason = task.CancellationReason,
            IsApproved = task.IsApproved,
            PreviousStatus = task.PreviousStatus,
            RevisedDeadline = task.RevisedDeadline,
            HeldAt = task.HeldAt,
            Assignees = task.Assignments.Select(a => new TaskAssigneeDTO
            {
                UserId = a.AssignedUserId,
                FullName = a.AssignedUser is not null
                    ? $"{a.AssignedUser.FirstName} {a.AssignedUser.MiddleName} {a.AssignedUser.LastName} {a.AssignedUser.Suffix}"
                        .Replace("  ", " ").Trim()
                    : "Unknown",
                EmployeeNumber = a.AssignedUser?.EmployeeNumber ?? "",
                Role = a.AssignedUser?.Role.ToString()
            }).ToList(),
            AttachmentCount = task.Attachments?.Count ?? 0,
            CreatedAt = task.CreatedAt,
            UpdatedAt = task.UpdatedAt
        };
    }
}