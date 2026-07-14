using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.AuthenticationAndCredentials;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/email-verification")]
public class EmailVerificationController : ControllerBase
{
    private readonly IEmailVerificationService _verificationService;
    private readonly string _frontendUrl;

    public EmailVerificationController(
        IEmailVerificationService verificationService,
        IConfiguration configuration)
    {
        _verificationService = verificationService;
        _frontendUrl = configuration["AppSettings:FrontendUrl"]
            ?? throw new InvalidOperationException("FrontendUrl not configured");
    }

    [HttpPost("verify")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDTO dto)
    {
        var result = await _verificationService.VerifyEmailAsync(dto.Token);
        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpPost("resend")]
    [Authorize(Policy = AuthorizationPolicies.CanManageUsers)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDTO dto)
    {
        var verificationUrl = $"{_frontendUrl}/verify-email";
        var result = await _verificationService.ResendVerificationAsync(
            dto.EmployeeId, dto.Email, verificationUrl);

        if (!result.IsSuccess)
            return BadRequest(result);

        return Ok(result);
    }

    [HttpGet("status/{userId:guid}")]
    [Authorize(Policy = AuthorizationPolicies.CanManageUsers)]
    public async Task<IActionResult> GetVerificationStatus(Guid userId)
    {
        var result = await _verificationService.GetVerificationStatusAsync(userId);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }
}
