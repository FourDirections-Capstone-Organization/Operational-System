using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.RoleBasedAccessControl;

public interface IRoleService
{
    ApiResponseDTO<List<RoleResponseDTO>> GetAllRoles();
    ApiResponseDTO<RoleResponseDTO> GetRoleByType(UserRole role);
    Task<ApiResponseDTO<UserPermissionsDTO>> GetUserPermissions(Guid userId);
    Task<ApiResponseDTO<bool>> UpdateUserRoleAsync(Guid userId, UpdateUserRoleDTO dto, Guid requestUserId);
}