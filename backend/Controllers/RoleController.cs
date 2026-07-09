using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models.DTOs;
using Backend.Models;
using Backend.Models.Enums;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoleController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RoleController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var result = _roleService.GetAllRoles();
        return Ok(result);
    }

    [HttpGet("{role}")]
    public IActionResult GetByRole(string role)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var roleEnum))
            return BadRequest(new { message = "Invalid role" });

        var result = _roleService.GetRoleByType(roleEnum);
        return Ok(result);
    }

    [HttpGet("user/{userId:guid}/permissions")]
    public async Task<IActionResult> GetUserPermissions(Guid userId)
    {
        var result = await _roleService.GetUserPermissions(userId);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpGet("my-permissions")]
    public async Task<IActionResult> GetMyPermissions()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user"));

        var result = await _roleService.GetUserPermissions(userIdGuid);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpPatch("user/{userId:guid}/role")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> UpdateUserRole(Guid userId, UpdateUserRoleDTO dto)
    {
        var requestUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(requestUserId) || !Guid.TryParse(requestUserId, out var requestUserIdGuid))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user"));

        var result = await _roleService.UpdateUserRoleAsync(userId, dto, requestUserIdGuid);
        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}
