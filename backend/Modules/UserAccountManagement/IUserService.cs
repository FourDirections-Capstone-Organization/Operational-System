using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.UserAccountManagement;

public interface IUserService
{
    Task<ApiResponseDTO<UserResponseDTO>> RegisterAsync(RegisterUserDTO dto);
    Task<ApiResponseDTO<List<UserResponseDTO>>> GetAllAsync(string? search = null, string? role = null, Guid? departmentId = null);
    Task<ApiResponseDTO<UserResponseDTO>> GetByIdAsync(Guid id);
    Task<ApiResponseDTO<UserResponseDTO>> GetByEmployeeNumberAsync(string employeeNumber);
    Task<ApiResponseDTO<UserResponseDTO>> UpdateAsync(Guid id, UpdateUserDTO dto, Guid? requestUserId = null);
    Task<ApiResponseDTO<bool>> DeactivateAsync(Guid id);
    Task<ApiResponseDTO<bool>> ActivateAsync(Guid id);
    Task<ApiResponseDTO<string>> GenerateEmployeeNumberAsync();
    Task SeedDefaultManagerAsync();
}
