using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.TaskManagement;

public interface IRecommendationService
{
    Task<ApiResponseDTO<RecommendationResponseDTO>> CreateAsync(Guid taskId, CreateRecommendationDTO dto, Guid coordinatorId);
    Task<ApiResponseDTO<List<RecommendationResponseDTO>>> GetByTaskIdAsync(Guid taskId);
    Task<ApiResponseDTO<List<RecommendationResponseDTO>>> GetByAssigneeIdAsync(
        Guid assigneeId, DateTime? dateFrom = null, DateTime? dateTo = null);
}
