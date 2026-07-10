using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.AspNetCore.Http;

namespace Backend.Modules.TaskManagement;

public interface ITaskCommentService
{
    Task<ApiResponseDTO<TaskCommentResponseDTO>> CreateAsync(
        Guid taskId, string content, IFormFile? file, Guid authorId);
    Task<ApiResponseDTO<List<TaskCommentResponseDTO>>> GetByTaskIdAsync(Guid taskId);
    Task<ApiResponseDTO<TaskCommentResponseDTO>> UpdateAsync(
        Guid commentId, string newContent, Guid userId);
    Task<ApiResponseDTO<bool>> DeleteAsync(Guid commentId, Guid userId);
}
