using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.Utilities;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DuplicateController : ControllerBase
{
    private readonly IDuplicateDetectionService _duplicateService;
    private readonly IAuditLogService _auditLogService;

    public DuplicateController(IDuplicateDetectionService duplicateService, IAuditLogService auditLogService)
    {
        _duplicateService = duplicateService;
        _auditLogService = auditLogService;
    }

    [HttpPost("check")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> CheckForDuplicates([FromBody] DuplicateCheckDTO dto)
    {
        var result = await _duplicateService.CheckForDuplicatesAsync(dto.Title, dto.Description);
        return Ok(result);
    }

    [HttpPost("decision")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> RecordDecision([FromBody] DuplicateDecisionDTO dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Decision))
            return BadRequest(ApiResponseDTO<object>.Failure("Decision is required."));

        var decision = dto.Decision.Trim().ToLowerInvariant();
        if (decision != "continue" && decision != "cancel")
            return BadRequest(ApiResponseDTO<object>.Failure("Decision must be 'continue' or 'cancel'."));

        var title = dto.Title;
        var matchCount = dto.MatchCount;
        var matchDetail = matchCount > 0
            ? $"{matchCount} potential duplicate(s)"
            : "no potential duplicates";

        var description = decision == "continue"
            ? $"Duplicate warning: Coordinator proceeded to create task '{title}' despite {matchDetail}"
            : $"Duplicate warning: Coordinator cancelled creation of task '{title}' ({matchDetail} found)";

        try
        {
            await _auditLogService.LogAsync(
                GetUserIdFromClaims(),
                AuditActionType.DuplicateOverride,
                "Task",
                null,
                GetIpAddress(),
                description,
                "TaskManagement");
        }
        catch
        {
            // audit logging must never break the flow
        }

        return Ok(ApiResponseDTO<object>.Success(new { recorded = true, decision }));
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
