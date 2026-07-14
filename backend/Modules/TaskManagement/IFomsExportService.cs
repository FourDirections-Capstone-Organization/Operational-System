using Backend.Models;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public interface IFomsExportService
{
    Task<ApiResponseDTO<byte[]>> ExportFomsCsvAsync(
        DateTime? dateRangeStart,
        DateTime? dateRangeEnd,
        Guid? employeeId,
        Guid requestUserId,
        UserRole requestUserRole,
        Guid? requestUserDepartmentId);
}
