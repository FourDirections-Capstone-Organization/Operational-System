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
public class AttachmentController : ControllerBase
{

    private readonly IAttachmentService _attachmentService;

    public AttachmentController(IAttachmentService attachmentService)
    {
        _attachmentService = attachmentService;
    }

    [HttpPost("tasks/{taskId:guid}/attachments")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Upload(
        Guid taskId,
        IFormFile file,
        [FromForm] string? description = null)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var uploaderId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _attachmentService.UploadAsync(taskId, file, description, uploaderId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpGet("tasks/{taskId:guid}/attachments")]
    public async Task<IActionResult> GetByTask(Guid taskId)
    {
        var result = await _attachmentService.GetByTaskIdAsync(taskId);
        return Ok(result);
    }

    [HttpGet("attachments/{id:guid}/download")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _attachmentService.GetByIdAsync(id);
        if (!result.IsSuccess)
            return NotFound(result);

        var attachment = result.Data!;

        if (!System.IO.File.Exists(attachment.FilePath))
            return NotFound(ApiResponseDTO<object>.Failure("File not found on disk"));

        // Downloads the file
        var fileBytes = await System.IO.File.ReadAllBytesAsync(attachment.FilePath);
        return File(fileBytes, "application/octet-stream", attachment.FileName);
    }

    [HttpDelete("attachments/{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _attachmentService.DeleteAsync(id);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }
}
