using System.Security.Claims;
using Backend.Models.DTOs;
using Backend.Modules.UserAccountManagement;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IUserService _userService;

    public ProfileController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPut("update-profile")]
    public async Task<IActionResult> UpdateProfile([FromForm] UpdateUserDTO dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var result = await _userService.UpdateAsync(userId, dto, userId);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);
            if (result.Message.Contains("permission") || result.Message.Contains("deactivated"))
                return BadRequest(result);
            return BadRequest(result);
        }

        return Ok(result);
    }
}
