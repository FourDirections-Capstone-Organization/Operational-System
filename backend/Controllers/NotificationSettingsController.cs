using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.Notifications;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationSettingsController : ControllerBase
{
    private readonly INotificationSettingsService _settingsService;

    public NotificationSettingsController(INotificationSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var result = await _settingsService.GetSettingsAsync();
        return Ok(result);
    }

    [HttpPut]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorOnly)]
    public async Task<IActionResult> Update(NotificationSettingsDTO dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? parsedUserId = null;
        if (!string.IsNullOrEmpty(userId) && Guid.TryParse(userId, out var parsed))
            parsedUserId = parsed;

        var result = await _settingsService.UpdateSettingsAsync(dto, parsedUserId);
        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}
