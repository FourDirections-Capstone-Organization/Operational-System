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

    Task<ApiResponseDTO<PaginatedResponseDTO<DepartmentWorkloadDTO>>> GetWorkloadByDepartmentAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        int pageNumber = 1,
        int pageSize = 10,
        DashboardFilterDTO? filters = null);

    Task<ApiResponseDTO<PaginatedResponseDTO<EmployeeAvailabilityResponseDTO>>> GetEmployeeAvailabilityAsync(
        int pageNumber = 1, int pageSize = 10, Guid? departmentId = null);

    Task<ApiResponseDTO<bool>> ValidateAssigneeAvailabilityAsync(Guid userId);
}
