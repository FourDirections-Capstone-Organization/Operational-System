using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.TaskManagement;

public interface IRecommendationService
{
    Task<ApiResponseDTO<RecommendationResponseDTO>> CreateAsync(Guid taskId, CreateRecommendationDTO dto, Guid coordinatorId);
    Task<ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>> GetByTaskIdAsync(Guid taskId, int pageNumber = 1, int pageSize = 10);
    Task<ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>> GetByAssigneeIdAsync(
        Guid assigneeId, int pageNumber = 1, int pageSize = 10, DateTime? dateFrom = null, DateTime? dateTo = null);
}
