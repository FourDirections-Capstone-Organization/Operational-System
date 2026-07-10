using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.TaskManagement;

public interface ITaskWorkflowService
{
    Task<ApiResponseDTO<TaskResponseDTO>> UpdateStatusAsync(Guid taskId, TaskStatusUpdateDTO dto, Guid userId);
    Task<ApiResponseDTO<TaskResponseDTO>> PushBackAsync(Guid taskId, PushBackDTO dto, Guid coordinatorId);
    Task<ApiResponseDTO<TaskResponseDTO>> ReviewTaskAsync(Guid taskId, ReviewTaskDTO dto, Guid reviewerId);
    Task<ApiResponseDTO<TaskResponseDTO>> PlaceOnHoldAsync(Guid taskId, PlaceOnHoldDTO dto, Guid coordinatorId);
    Task<ApiResponseDTO<TaskResponseDTO>> ResumeTaskAsync(Guid taskId, ResumeTaskDTO dto, Guid coordinatorId);
    Task<ApiResponseDTO<TaskResponseDTO>> CancelTaskAsync(Guid taskId, CancelTaskDTO dto, Guid coordinatorId);
}