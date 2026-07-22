using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public interface ISuitabilityService
{
    Task<ApiResponseDTO<List<SuitabilityResponseDTO>>> GetSuitableEmployeesAsync(
        Guid taskId, UserRole callerRole, Guid callerDepartmentId);
}
