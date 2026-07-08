using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Services.OrganizationalStructure;

public interface IJobPositionService
{
    Task<ApiResponseDTO<List<JobPositionResponseDTO>>> GetAllAsync();
    Task<ApiResponseDTO<List<JobPositionResponseDTO>>> GetByDepartmentAsync(Guid departmentId);
    Task<ApiResponseDTO<JobPositionResponseDTO>> GetByIdAsync(Guid id);
    Task<ApiResponseDTO<JobPositionResponseDTO>> CreateAsync(CreateJobPositionDTO dto);
    Task<ApiResponseDTO<JobPositionResponseDTO>> UpdateAsync(Guid id, UpdateJobPositionDTO dto);
    Task<ApiResponseDTO<bool>> DeleteAsync(Guid id);
}
