using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public interface IReportService
{
    Task<ApiResponseDTO<KpiTrackingDTO>> GetKpiTrackingAsync(
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId,
        KpiFilterDTO? filters = null);

    Task<ApiResponseDTO<PerformanceReportDTO>> GeneratePerformanceReportAsync(
        PerformanceReportFilterDTO filters,
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId);

    Task<ApiResponseDTO<byte[]>> ExportReportAsync(
        PerformanceReportDTO reportData,
        ExportFormat format);

    Task<ApiResponseDTO<EmployeePerformanceSummaryDTO>> GetEmployeePerformanceSummaryAsync(
        Guid employeeId,
        EmployeePerformanceFilterDTO? filters,
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId);

    Task<ApiResponseDTO<DepartmentKpiDTO>> GetDepartmentKpiAsync(
        Guid departmentId,
        DateTime? from = null,
        DateTime? to = null);
}
