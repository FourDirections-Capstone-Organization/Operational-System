using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class RecommendationController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    private readonly IAuditLogService _auditLogService;

    public RecommendationController(IRecommendationService recommendationService, IAuditLogService auditLogService)
    {
        _recommendationService = recommendationService;
        _auditLogService = auditLogService;
    }

    [HttpPost("tasks/{taskId:guid}/recommendations")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Create(Guid taskId, CreateRecommendationDTO dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var coordinatorId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _recommendationService.CreateAsync(taskId, dto, coordinatorId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return CreatedAtAction(nameof(GetByTask), new { taskId }, result);
    }

    [HttpGet("tasks/{taskId:guid}/recommendations")]
    public async Task<IActionResult> GetByTask(
        Guid taskId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _recommendationService.GetByTaskIdAsync(taskId, pageNumber, pageSize);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpGet("users/{userId:guid}/recommendations")]
    public async Task<IActionResult> GetByAssignee(
        Guid userId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        // Employees may view their own recommendation history; Coordinators and
        // Managers may view any employee's history (ahead of a monthly review).
        var currentUserId = GetUserIdFromClaims();
        var roleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
        var isCoordOrManager = roleClaim == Models.Enums.UserRole.Coordinator.ToString()
            || roleClaim == Models.Enums.UserRole.Manager.ToString();
        if (!isCoordOrManager && currentUserId != userId)
            return StatusCode(403, ApiResponseDTO<object>.Failure("Access denied"));

        var result = await _recommendationService.GetByAssigneeIdAsync(userId, pageNumber, pageSize, dateFrom, dateTo);

        try
        {
            await _auditLogService.LogAsync(
                currentUserId,
                AuditActionType.Read,
                "Recommendation",
                userId,
                GetIpAddress(),
                "Recommendation history accessed",
                "Recommendations");
        }
        catch
        {
            // audit logging must never break the response
        }

        return Ok(result);
    }

    private Guid? GetUserIdFromClaims()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userIdGuid))
            return null;
        return userIdGuid;
    }

    private string? GetIpAddress()
    {
        var forwardedFor = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
            return forwardedFor.Split(',').First().Trim();

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
