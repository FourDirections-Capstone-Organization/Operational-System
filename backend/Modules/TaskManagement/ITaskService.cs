using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public interface ITaskService
{
    Task<ApiResponseDTO<TaskResponseDTO>> CreateAsync(CreateTaskDTO dto, Guid creatorId, string? ipAddress = null);
    Task<ApiResponseDTO<List<TaskResponseDTO>>> GetAllAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        Models.Enums.TaskStatus? status = null,
        PriorityLevel? priority = null,
        TaskClassification? classification = null,
        Guid? assignedToUserId = null,
        Guid? departmentId = null,
        string? search = null);
    Task<ApiResponseDTO<TaskResponseDTO>> GetByIdAsync(Guid id, Guid requestUserId, UserRole requestUserRole);
    Task<ApiResponseDTO<TaskResponseDTO>> UpdateAsync(Guid id, UpdateTaskDTO dto, Guid requestUserId, string? ipAddress = null);
    Task<ApiResponseDTO<List<TaskAssigneeDTO>>> GetAssignableUsersAsync();
}