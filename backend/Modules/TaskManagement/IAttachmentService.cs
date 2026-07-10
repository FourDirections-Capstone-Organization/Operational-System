using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.TaskManagement;

public interface IAttachmentService
{
    Task<ApiResponseDTO<TaskAttachmentResponseDTO>> UploadAsync(
        Guid taskId, IFormFile file, string? description, Guid uploaderId);
    Task<ApiResponseDTO<List<TaskAttachmentResponseDTO>>> GetByTaskIdAsync(Guid taskId);
    Task<ApiResponseDTO<TaskAttachment>> GetByIdAsync(Guid id);
    Task<ApiResponseDTO<bool>> DeleteAsync(Guid id);
}