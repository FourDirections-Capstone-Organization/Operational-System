using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.RoleBasedAccessControl;

public class RoleService : IRoleService
{
    private readonly AppDbContext _db;

    public RoleService(AppDbContext db)
    {
        _db = db;
    }

    public ApiResponseDTO<List<RoleResponseDTO>> GetAllRoles()
    {
        var roles = new List<RoleResponseDTO>
        {
            new RoleResponseDTO
            {
                Role = UserRole.Manager,
                DisplayName = "Manager",
                Description = "Full system access including user management and audit logs",
                Permissions = GetPermissionsForRole(UserRole.Manager)
            },
            new RoleResponseDTO
            {
                Role = UserRole.Coordinator,
                DisplayName = "Coordinator",
                Description = "Can manage tasks, view team tasks, and mark tasks as confidential",
                Permissions = GetPermissionsForRole(UserRole.Coordinator)
            },
            new RoleResponseDTO
            {
                Role = UserRole.Dispatcher,
                DisplayName = "Dispatcher",
                Description = "Can view and update assigned tasks",
                Permissions = GetPermissionsForRole(UserRole.Dispatcher)
            },
            new RoleResponseDTO
            {
                Role = UserRole.Encoder,
                DisplayName = "Encoder",
                Description = "Can view and update assigned tasks",
                Permissions = GetPermissionsForRole(UserRole.Encoder)
            },
            new RoleResponseDTO
            {
                Role = UserRole.Courier,
                DisplayName = "Courier/Driver",
                Description = "Can view and update assigned delivery tasks",
                Permissions = GetPermissionsForRole(UserRole.Courier)
            }
        };

        return ApiResponseDTO<List<RoleResponseDTO>>.Success(roles);
    }

    private List<string> GetPermissionsForRole(UserRole role)
    {
        var permissions = new List<string>();

        // Base permissions for all roles
        permissions.Add("ViewOwnProfile");
        permissions.Add("UpdateOwnProfile");
        permissions.Add("ViewAssignedTasks");
        permissions.Add("UpdateAssignedTasks");

        switch (role)
        {
            case UserRole.Manager:
                permissions.Add("ViewAllTasks");
                permissions.Add("CreateTasks");
                permissions.Add("AssignTasks");
                permissions.Add("DeleteTasks");
                permissions.Add("ViewAllUsers");
                permissions.Add("CreateUsers");
                permissions.Add("UpdateUsers");
                permissions.Add("DeactivateUsers");
                permissions.Add("ViewAuditLogs");
                permissions.Add("ViewConfidentialTasks");
                permissions.Add("ManageDepartments");
                permissions.Add("ManageRoles");
                break;

            case UserRole.Coordinator:
                permissions.Add("ViewDepartmentTasks");
                permissions.Add("CreateTasks");
                permissions.Add("AssignTasks");
                permissions.Add("MarkTasksConfidential");
                permissions.Add("ViewConfidentialTasks");
                permissions.Add("ViewDepartmentUsers");
                break;

            case UserRole.Dispatcher:
                permissions.Add("UpdateTaskStatus");
                break;

            case UserRole.Encoder:
                permissions.Add("UpdateTaskStatus");
                break;

            case UserRole.Courier:
                permissions.Add("UpdateTaskStatus");
                permissions.Add("UpdateDeliveryStatus");
                break;
        }

        return permissions;
    }
}
