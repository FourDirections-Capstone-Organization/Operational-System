using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class RecommendationController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;

    public RecommendationController(IRecommendationService recommendationService)
    {
        _recommendationService = recommendationService;
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
    public async Task<IActionResult> GetByTask(Guid taskId)
    {
        var result = await _recommendationService.GetByTaskIdAsync(taskId);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpGet("users/{userId:guid}/recommendations")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetByAssignee(
        Guid userId,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var result = await _recommendationService.GetByAssigneeIdAsync(userId, dateFrom, dateTo);
        return Ok(result);
    }
}
