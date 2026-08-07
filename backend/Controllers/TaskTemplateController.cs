using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TaskTemplateController : ControllerBase
{
    private readonly ITaskTemplateService _templateService;

    public TaskTemplateController(ITaskTemplateService templateService)
    {
        _templateService = templateService;
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Create(CreateTaskTemplateDTO dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var creatorId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _templateService.CreateAsync(dto, creatorId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _templateService.GetAllAsync(pageNumber, pageSize);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _templateService.GetByIdAsync(id);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Update(Guid id, UpdateTaskTemplateDTO dto)
    {
        var result = await _templateService.UpdateAsync(id, dto);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var requestUserId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _templateService.DeleteAsync(id, requestUserId);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpPost("{id:guid}/deploy")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> DeployManually(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var coordinatorId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _templateService.DeployManuallyAsync(id, coordinatorId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }
}
