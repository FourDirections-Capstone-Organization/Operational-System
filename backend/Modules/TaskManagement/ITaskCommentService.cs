using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.AspNetCore.Http;

namespace Backend.Modules.TaskManagement;

public interface ITaskCommentService
{
    Task<ApiResponseDTO<TaskCommentResponseDTO>> CreateAsync(
        Guid taskId, string content, IFormFile? file, Guid authorId);
    Task<ApiResponseDTO<PaginatedResponseDTO<TaskCommentResponseDTO>>> GetByTaskIdAsync(Guid taskId, int pageNumber = 1, int pageSize = 10);
    Task<ApiResponseDTO<TaskCommentResponseDTO>> UpdateAsync(
        Guid commentId, string newContent, Guid userId);
    Task<ApiResponseDTO<bool>> DeleteAsync(Guid commentId, Guid userId);
}
