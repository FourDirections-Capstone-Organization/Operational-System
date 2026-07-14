using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.OrganizationalStructure;

public interface IJobPositionService
{
    Task<ApiResponseDTO<PaginatedResponseDTO<JobPositionResponseDTO>>> GetAllAsync(int pageNumber = 1, int pageSize = 10);
    Task<ApiResponseDTO<PaginatedResponseDTO<JobPositionResponseDTO>>> GetByDepartmentAsync(Guid departmentId, int pageNumber = 1, int pageSize = 10);
    Task<ApiResponseDTO<JobPositionResponseDTO>> GetByIdAsync(Guid id);
    Task<ApiResponseDTO<JobPositionResponseDTO>> CreateAsync(CreateJobPositionDTO dto);
    Task<ApiResponseDTO<JobPositionResponseDTO>> UpdateAsync(Guid id, UpdateJobPositionDTO dto);
    Task<ApiResponseDTO<bool>> DeleteAsync(Guid id);
}
