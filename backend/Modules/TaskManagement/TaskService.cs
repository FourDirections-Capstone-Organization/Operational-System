using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.Notifications;

namespace Backend.Modules.TaskManagement;

public class TaskService : ITaskService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;

    public TaskService(AppDbContext db, INotificationService notificationService)
    {
        _db = db;
        _notificationService = notificationService;
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> CreateAsync(CreateTaskDTO dto, Guid creatorId)
    {
        var creator = await _db.Users.FindAsync(creatorId);
        if (creator is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Creator not found");

        if (creator.Role != UserRole.Coordinator && creator.Role != UserRole.Manager)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Only Coordinators and Managers can create tasks");

        if (string.IsNullOrWhiteSpace(dto.Title))
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task title is required");

        if (string.IsNullOrWhiteSpace(dto.Description))
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task description is required");

        var now = DateTime.UtcNow;
        var deadline = dto.Deadline;
        var isSLALocked = false;

        if (dto.PriorityLevel == PriorityLevel.Urgent)
        {
            deadline = now.AddHours(24);
            isSLALocked = true;
        }
        else
        {
            if (!deadline.HasValue)
                return ApiResponseDTO<TaskResponseDTO>.Failure("Deadline is required for non-Urgent tasks");

            if (deadline.Value <= now)
                return ApiResponseDTO<TaskResponseDTO>.Failure("Deadline must be a future date/time");
        }

        var assignmentValidation = await ValidateAssignmentAsync(
            dto.AssignmentScope, dto.AssignedUserIds, dto.AssignedDepartmentId);

        if (!assignmentValidation.IsValid)
            return ApiResponseDTO<TaskResponseDTO>.Failure(assignmentValidation.ErrorMessage!);

        var task = new Models.Task
        {
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            PriorityLevel = dto.PriorityLevel,
            Classification = dto.Classification,
            Status = Models.Enums.TaskStatus.NotStarted,
            AssignmentScope = dto.AssignmentScope,
            Deadline = deadline.Value,
            IsSLALocked = isSLALocked,
            IsConfidential = dto.IsConfidential,
            CreatedById = creatorId,
            AssignedDepartmentId = dto.AssignedDepartmentId,
            CreatedAt = now
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        var assignedUserIds = await ResolveAssignedUserIdsAsync(
            dto.AssignmentScope, dto.AssignedUserIds, dto.AssignedDepartmentId);

        foreach (var userId in assignedUserIds)
        {
            _db.TaskAssignments.Add(new TaskAssignment
            {
                TaskId = task.Id,
                AssignedUserId = userId,
                AssignedAt = now
            });
        }

        await _db.SaveChangesAsync();

        if (assignedUserIds.Count > 0)
        {
            var taskTitle = task.Title.Length > 50 ? task.Title[..50] + "..." : task.Title;
            await _notificationService.SendBulkNotificationAsync(
                assignedUserIds,
                NotificationType.TaskAssigned,
                "New Task Assigned",
                $"You have been assigned task '{taskTitle}' with deadline {task.Deadline:MMM dd, yyyy h:mm tt}.",
                task.Id);
        }

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task created and assigned successfully");
    }

    public async Task<ApiResponseDTO<List<TaskResponseDTO>>> GetAllAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        Models.Enums.TaskStatus? status = null,
        PriorityLevel? priority = null,
        TaskClassification? classification = null,
        Guid? assignedToUserId = null,
        Guid? departmentId = null,
        string? search = null)
    {
        var query = _db.Tasks
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .Include(t => t.Assignments)
                .ThenInclude(a => a.AssignedUser)
            .Include(t => t.Attachments)
            .AsQueryable();

        // TASK VISIBILITY FILTER (FR-010, FR-011, FR-012, FR-013)
        switch (requestUserRole)
        {
            case UserRole.Manager:
                break;

            case UserRole.Coordinator:
                if (requestUserDepartmentId.HasValue)
                    query = query.Where(t => t.AssignedDepartmentId == requestUserDepartmentId.Value);
                break;

            case UserRole.Dispatcher:
            case UserRole.Encoder:
            case UserRole.Courier:
                query = query.Where(t => t.Assignments.Any(a => a.AssignedUserId == requestUserId));
                query = query.Where(t => !t.IsConfidential);
                break;
        }

        if (status.HasValue)
            query = query.Where(t => t.Status == status.Value);

        if (priority.HasValue)
            query = query.Where(t => t.PriorityLevel == priority.Value);

        if (classification.HasValue)
            query = query.Where(t => t.Classification == classification.Value);

        if (assignedToUserId.HasValue)
            query = query.Where(t => t.Assignments.Any(a => a.AssignedUserId == assignedToUserId.Value));

        if (departmentId.HasValue)
            query = query.Where(t => t.AssignedDepartmentId == departmentId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(t =>
                t.Title.ToLower().Contains(searchLower) ||
                t.Description.ToLower().Contains(searchLower));
        }

        var tasks = await query
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        var response = new List<TaskResponseDTO>();
        foreach (var task in tasks)
        {
            response.Add(await MapToResponseDTOAsync(task));
        }

        return ApiResponseDTO<List<TaskResponseDTO>>.Success(response);
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> GetByIdAsync(Guid id, Guid requestUserId, UserRole requestUserRole)
    {
        var task = await _db.Tasks
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .Include(t => t.Assignments)
                .ThenInclude(a => a.AssignedUser)
            .Include(t => t.Attachments)
                .ThenInclude(a => a.UploadedBy)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        // ACCESS CHECK (FR-010, FR-013)
        if (requestUserRole == UserRole.Dispatcher ||
            requestUserRole == UserRole.Encoder ||
            requestUserRole == UserRole.Courier)
        {
            if (task.IsConfidential)
                return ApiResponseDTO<TaskResponseDTO>.Failure("Access denied: task is confidential");

            var isAssigned = task.Assignments.Any(a => a.AssignedUserId == requestUserId);
            if (!isAssigned)
                return ApiResponseDTO<TaskResponseDTO>.Failure("Access denied: task is not assigned to you");
        }

        return ApiResponseDTO<TaskResponseDTO>.Success(await MapToResponseDTOAsync(task));
    }

    public async Task<ApiResponseDTO<TaskResponseDTO>> UpdateAsync(Guid id, UpdateTaskDTO dto, Guid requestUserId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (task is null)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Task not found");

        var requestUser = await _db.Users.FindAsync(requestUserId);
        if (requestUser is null || (requestUser.Role != UserRole.Coordinator && requestUser.Role != UserRole.Manager))
            return ApiResponseDTO<TaskResponseDTO>.Failure("Only Coordinators and Managers can update tasks");

        if (requestUser.Role == UserRole.Coordinator 
            && requestUser.DepartmentId != task.AssignedDepartmentId)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Cannot update tasks from another department");

        if (task.Status == Models.Enums.TaskStatus.Completed)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Cannot modify a completed task");

        if (task.Status == Models.Enums.TaskStatus.Cancelled)
            return ApiResponseDTO<TaskResponseDTO>.Failure("Cannot modify a cancelled task");

        if (!string.IsNullOrWhiteSpace(dto.Title))
            task.Title = dto.Title.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Description))
            task.Description = dto.Description.Trim();

        if (dto.PriorityLevel.HasValue)
        {
            task.PriorityLevel = dto.PriorityLevel.Value;

            if (dto.PriorityLevel.Value == PriorityLevel.Urgent)
            {
                task.Deadline = task.CreatedAt.AddHours(24);
                task.IsSLALocked = true;
            }
            else
            {
                task.IsSLALocked = false;
            }
        }

        if (dto.Classification.HasValue)
            task.Classification = dto.Classification.Value;

        if (dto.Deadline.HasValue && !task.IsSLALocked)
        {
            if (dto.Deadline.Value <= DateTime.UtcNow)
                return ApiResponseDTO<TaskResponseDTO>.Failure("Deadline must be a future date/time");

            task.Deadline = dto.Deadline.Value;
        }

        if (dto.AssignmentScope.HasValue)
            task.AssignmentScope = dto.AssignmentScope.Value;

        if (dto.AssignedDepartmentId.HasValue)
            task.AssignedDepartmentId = dto.AssignedDepartmentId;

        if (dto.IsConfidential.HasValue)
            task.IsConfidential = dto.IsConfidential.Value;

        if (dto.AssignedUserIds != null)
        {
            _db.TaskAssignments.RemoveRange(task.Assignments);

            foreach (var userId in dto.AssignedUserIds)
            {
                _db.TaskAssignments.Add(new TaskAssignment
                {
                    TaskId = task.Id,
                    AssignedUserId = userId,
                    AssignedAt = DateTime.UtcNow
                });
            }
        }

        task.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var currentAssigneeIds = task.Assignments.Select(a => a.AssignedUserId).ToList();
        if (currentAssigneeIds.Count > 0)
        {
            var taskTitle = task.Title.Length > 50 ? task.Title[..50] + "..." : task.Title;
            await _notificationService.SendBulkNotificationAsync(
                currentAssigneeIds,
                NotificationType.TaskUpdated,
                "Task Updated",
                $"Task '{taskTitle}' has been updated. Check the latest details.",
                task.Id);
        }

        return ApiResponseDTO<TaskResponseDTO>.Success(
            await MapToResponseDTOAsync(task),
            "Task updated successfully");
    }

    public async Task<ApiResponseDTO<List<TaskAssigneeDTO>>> GetAssignableUsersAsync()
    {
        var assignableRoles = new[] { UserRole.Dispatcher, UserRole.Encoder, UserRole.Courier };

        var users = await _db.Users
            .Where(u => assignableRoles.Contains(u.Role) && u.IsActive && !u.IsDeactivated)
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync();

        var result = users.Select(u => new TaskAssigneeDTO
        {
            UserId = u.Id,
            FullName = $"{u.FirstName} {u.MiddleName} {u.LastName} {u.Suffix}"
                .Replace("  ", " ").Trim(),
            EmployeeNumber = u.EmployeeNumber,
            Role = u.Role.ToString()
        }).ToList();

        return ApiResponseDTO<List<TaskAssigneeDTO>>.Success(result);
    }



    private async Task<(bool IsValid, string? ErrorMessage)> ValidateAssignmentAsync(
        AssignmentScope scope, List<Guid>? userIds, Guid? departmentId)
    {
        switch (scope)
        {
            case AssignmentScope.SingleEmployee:
                if (userIds is null || userIds.Count == 0)
                    return (false, "At least one assigned user is required for SingleEmployee scope");

                if (userIds.Count != 1)
                    return (false, "Exactly one user must be assigned for SingleEmployee scope");

                var userExists = await _db.Users
                    .AnyAsync(u => u.Id == userIds[0] && u.IsActive && !u.IsDeactivated);

                if (!userExists)
                    return (false, "Selected user is inactive or does not exist");

                var userRole = await _db.Users
                    .Where(u => u.Id == userIds[0])
                    .Select(u => u.Role)
                    .FirstOrDefaultAsync();

                var allowedRoles = new[] { UserRole.Dispatcher, UserRole.Encoder, UserRole.Courier };
                if (!allowedRoles.Contains(userRole))
                    return (false, "Assigned user must be an active Dispatcher, Encoder, or Courier");

                return (true, null);

            case AssignmentScope.Team:
                if (userIds is null || userIds.Count == 0)
                    return (false, "At least one team member is required for Team scope");

                foreach (var userId in userIds)
                {
                    var exists = await _db.Users
                        .AnyAsync(u => u.Id == userId && u.IsActive && !u.IsDeactivated);

                    if (!exists)
                        return (false, $"User {userId} is inactive or does not exist");
                }

                return (true, null);

            case AssignmentScope.Department:
                if (!departmentId.HasValue)
                    return (false, "Department is required for Department scope");

                var deptExists = await _db.Departments
                    .AnyAsync(d => d.Id == departmentId.Value && d.IsActive);

                if (!deptExists)
                    return (false, "Selected department is inactive or does not exist");

                return (true, null);

            default:
                return (false, "Invalid assignment scope");
        }
    }
    
    private async Task<List<Guid>> ResolveAssignedUserIdsAsync(
        AssignmentScope scope, List<Guid>? userIds, Guid? departmentId)
    {
        switch (scope)
        {
            case AssignmentScope.SingleEmployee:
            case AssignmentScope.Team:
                return userIds ?? new List<Guid>();

            case AssignmentScope.Department:
                if (!departmentId.HasValue)
                    return new List<Guid>();

                return await _db.Users
                    .Where(u => u.DepartmentId == departmentId.Value
                        && u.IsActive
                        && !u.IsDeactivated)
                    .Select(u => u.Id)
                    .ToListAsync();

            default:
                return new List<Guid>();
        }
    }

    private async Task<TaskResponseDTO> MapToResponseDTOAsync(Models.Task task)
    {
        // Explicit Loading to Task
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