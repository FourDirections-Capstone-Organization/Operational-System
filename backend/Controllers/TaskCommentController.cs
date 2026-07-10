using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.TaskManagement;

namespace Backend.Controllers;

[ApiController]
[Route("api/tasks/{taskId:guid}/comments")]
[Authorize]
public class TaskCommentController : ControllerBase
{
    private readonly ITaskCommentService _commentService;

    public TaskCommentController(ITaskCommentService commentService)
    {
        _commentService = commentService;
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        Guid taskId,
        [FromForm] string content,
        [FromForm] IFormFile? attachment = null)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var authorId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _commentService.CreateAsync(taskId, content, attachment, authorId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return CreatedAtAction(nameof(GetByTask), new { taskId }, result);
    }

    [HttpGet]
    public async Task<IActionResult> GetByTask(Guid taskId)
    {
        var result = await _commentService.GetByTaskIdAsync(taskId);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpPut("{commentId:guid}")]
    public async Task<IActionResult> Update(Guid taskId, Guid commentId, UpdateTaskCommentDTO dto)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var parsedUserId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _commentService.UpdateAsync(commentId, dto.Content, parsedUserId);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("Unauthorized"))
                return StatusCode(403, result);

            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpDelete("{commentId:guid}")]
    public async Task<IActionResult> Delete(Guid taskId, Guid commentId)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var parsedUserId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _commentService.DeleteAsync(commentId, parsedUserId);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("Unauthorized"))
                return StatusCode(403, result);

            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }
}
