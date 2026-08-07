using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Modules.Notifications;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Backend.Models.Enums.NotificationType? type = null,
        [FromQuery] DateTime? dateFrom = null,
        [FromQuery] DateTime? dateTo = null)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var recipientId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _notificationService.GetByRecipientAsync(
            recipientId, pageNumber, pageSize, type, dateFrom, dateTo);
        return Ok(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var recipientId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _notificationService.GetUnreadCountAsync(recipientId);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var recipientId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _notificationService.MarkAsReadAsync(id, recipientId);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var recipientId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        var result = await _notificationService.MarkAllAsReadAsync(recipientId);
        return Ok(result);
    }
}
