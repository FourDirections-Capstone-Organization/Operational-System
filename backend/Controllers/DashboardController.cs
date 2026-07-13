using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly AppDbContext _db;

    public DashboardController(IDashboardService dashboardService, AppDbContext db)
    {
        _dashboardService = dashboardService;
        _db = db;
    }

    [HttpGet("metrics")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetMetrics(
        [FromQuery] DateTime? dateRangeStart = null,
        [FromQuery] DateTime? dateRangeEnd = null,
        [FromQuery] Guid? employeeId = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] Models.Enums.TaskStatus? status = null)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRoleStr = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var requestUserId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        if (!Enum.TryParse<UserRole>(userRoleStr, true, out var requestUserRole))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid role"));

        Guid? requestUserDepartmentId = null;
        if (requestUserRole == UserRole.Coordinator)
        {
            var user = await _db.Users.FindAsync(requestUserId);
            requestUserDepartmentId = user?.DepartmentId;
        }

        var filters = new DashboardFilterDTO
        {
            DateRangeStart = dateRangeStart,
            DateRangeEnd = dateRangeEnd,
            EmployeeId = employeeId,
            DepartmentId = departmentId,
            Status = status
        };

        var result = await _dashboardService.GetDashboardMetricsAsync(
            requestUserId, requestUserRole, requestUserDepartmentId, filters);
        return Ok(result);
    }

    [HttpGet("workload/department")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetWorkloadByDepartment(
        [FromQuery] DateTime? dateRangeStart = null,
        [FromQuery] DateTime? dateRangeEnd = null,
        [FromQuery] Guid? departmentId = null)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRoleStr = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var requestUserId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        if (!Enum.TryParse<UserRole>(userRoleStr, true, out var requestUserRole))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid role"));

        Guid? requestUserDepartmentId = null;
        if (requestUserRole == UserRole.Coordinator)
        {
            var user = await _db.Users.FindAsync(requestUserId);
            requestUserDepartmentId = user?.DepartmentId;
        }

        var filters = new DashboardFilterDTO
        {
            DateRangeStart = dateRangeStart,
            DateRangeEnd = dateRangeEnd,
            DepartmentId = departmentId
        };

        var result = await _dashboardService.GetWorkloadByDepartmentAsync(
            requestUserId, requestUserRole, requestUserDepartmentId, filters);
        return Ok(result);
    }

    [HttpGet("employee-availability")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetEmployeeAvailability(
        [FromQuery] Guid? departmentId = null)
    {
        var result = await _dashboardService.GetEmployeeAvailabilityAsync(departmentId);
        return Ok(result);
    }
}
