using Microsoft.AspNetCore.Authorization;
using Backend.Models.Enums;

namespace Backend.Modules.RoleBasedAccessControl;

public static class AuthorizationPolicies
{
    public const string ManagerOnly = "ManagerOnly";
    public const string CoordinatorAndAbove = "CoordinatorAndAbove";
    public const string CanViewConfidentialTasks = "CanViewConfidentialTasks";
    public const string CanManageUsers = "CanManageUsers";
    public const string CanAccessAuditLogs = "CanAccessAuditLogs";

    public static void ConfigurePolicies(AuthorizationOptions options)
    {
        // Manager Only
        options.AddPolicy(ManagerOnly, policy => 
            policy.RequireRole(UserRole.Manager.ToString()));

        // Coordinator or Manager
        options.AddPolicy(CoordinatorAndAbove, policy =>
            policy.RequireRole(UserRole.Manager.ToString(), UserRole.Coordinator.ToString()));

        // Can manage users (Manager Only)
        options.AddPolicy(CanManageUsers, policy =>
            policy.RequireRole(UserRole.Manager.ToString()));

        // Can access audit logs (Manager Only)
        options.AddPolicy(CanAccessAuditLogs, policy =>
            policy.RequireRole(UserRole.Manager.ToString()));
    }
}
