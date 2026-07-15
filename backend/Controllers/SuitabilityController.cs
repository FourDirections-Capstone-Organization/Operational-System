using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;
using Backend.Models.Enums;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class SuitabilityController : ControllerBase
{
    private readonly ISuitabilityService _suitabilityService;

    public SuitabilityController(ISuitabilityService suitabilityService)
    {
        _suitabilityService = suitabilityService;
    }

    [HttpGet("tasks/{taskId:guid}/suitability")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetSuitableEmployees(Guid taskId)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
        var departmentClaim = User.FindFirst("DepartmentId")?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || string.IsNullOrEmpty(roleClaim))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        if (!Enum.TryParse<UserRole>(roleClaim, out var role))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid role"));

        var departmentId = !string.IsNullOrEmpty(departmentClaim) && Guid.TryParse(departmentClaim, out var deptId)
            ? deptId : Guid.Empty;

        var result = await _suitabilityService.GetSuitableEmployeesAsync(taskId, role, departmentId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}
