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
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Update(NotificationSettingsDTO dto)
    {
        var result = await _settingsService.UpdateSettingsAsync(dto);
        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }
}
