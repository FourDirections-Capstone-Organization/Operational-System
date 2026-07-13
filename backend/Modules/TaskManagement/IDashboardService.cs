using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public interface IDashboardService
{
    Task<ApiResponseDTO<DashboardMetricsDTO>> GetDashboardMetricsAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        DashboardFilterDTO? filters = null);

    Task<ApiResponseDTO<List<DepartmentWorkloadDTO>>> GetWorkloadByDepartmentAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        DashboardFilterDTO? filters = null);

    Task<ApiResponseDTO<List<EmployeeAvailabilityResponseDTO>>> GetEmployeeAvailabilityAsync(
        Guid? departmentId = null);

    Task<ApiResponseDTO<bool>> ValidateAssigneeAvailabilityAsync(Guid userId);
}
