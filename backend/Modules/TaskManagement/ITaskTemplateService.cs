using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.TaskManagement;

public interface ITaskTemplateService
{
    Task<ApiResponseDTO<TaskTemplateResponseDTO>> CreateAsync(CreateTaskTemplateDTO dto, Guid creatorId);
    Task<ApiResponseDTO<List<TaskTemplateResponseDTO>>> GetAllAsync();
    Task<ApiResponseDTO<TaskTemplateResponseDTO>> GetByIdAsync(Guid id);
    Task<ApiResponseDTO<TaskTemplateResponseDTO>> UpdateAsync(Guid id, UpdateTaskTemplateDTO dto);
    Task<ApiResponseDTO<bool>> DeactivateAsync(Guid id);
    Task<ApiResponseDTO<TaskResponseDTO>> DeployManuallyAsync(Guid id, Guid coordinatorId);
}
