using System.ComponentModel.DataAnnotations;
using Backend.Models.Enums;

namespace Backend.Models.DTOs;

public class RoleResponseDTO
{
    public UserRole Role { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Permissions { get; set; } = new();
}

public class UserPermissionsDTO
{
    public Guid UserId { get; set; }
    public UserRole Role { get; set; }
    public List<string> Permissions { get; set; } = new();
    public bool CanViewAllTasks { get; set; }
    public bool CanManageUsers { get; set; }
    public bool CanViewConfidentialTasks { get; set; }
    public bool CanAccessAuditLogs { get; set; }
}

public class UpdateUserRoleDTO
{
    public UserRole NewRole { get; set; }
    
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}