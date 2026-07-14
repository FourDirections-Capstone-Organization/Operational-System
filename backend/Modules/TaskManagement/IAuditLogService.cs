using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Task = System.Threading.Tasks.Task;

namespace Backend.Modules.TaskManagement;

public interface IAuditLogService
{
    Task LogAsync(
        Guid? userId,
        AuditActionType actionType,
        string targetEntity,
        Guid? targetEntityId,
        string? ipAddress,
        string description,
        string module,
        string? oldValue = null,
        string? newValue = null);

    Task<ApiResponseDTO<PaginatedResponseDTO<AuditLogResponseDTO>>> GetAllAsync(int pageNumber = 1, int pageSize = 10, AuditLogFilterDTO? filters = null);

    Task<ApiResponseDTO<AuditLogResponseDTO>> GetByIdAsync(Guid id);

    Task LogAccessAsync(Guid userId, string? ipAddress);

    Task LogAccessDeniedAsync(Guid? userId, string? ipAddress, string targetEntity);

    Task LogBlockedModificationAsync(
        Guid? userId,
        string? ipAddress,
        string attemptedAction,
        Guid? targetEntityId);
}
