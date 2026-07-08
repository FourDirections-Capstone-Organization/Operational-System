using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Services.OrganizationalStructure;

public interface IDepartmentService
{
    Task<ApiResponseDTO<List<DepartmentResponseDTO>>> GetAllAsync();
    Task<ApiResponseDTO<DepartmentResponseDTO>> GetByIdAsync(Guid id);
    Task<ApiResponseDTO<DepartmentResponseDTO>> CreateAsync(CreateDepartmentDTO dto);
    Task<ApiResponseDTO<DepartmentResponseDTO>> UpdateAsync(Guid id, UpdateDepartmentDTO dto);
    Task<ApiResponseDTO<bool>> DeleteAsync(Guid id);
    Task SeedDefaultDepartmentsAsync();
}
