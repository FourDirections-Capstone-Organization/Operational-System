using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.Utilities;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DuplicateController : ControllerBase
{
    private readonly IDuplicateDetectionService _duplicateService;

    public DuplicateController(IDuplicateDetectionService duplicateService)
    {
        _duplicateService = duplicateService;
    }

    [HttpPost("check")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> CheckForDuplicates([FromBody] DuplicateCheckDTO dto)
    {
        var result = await _duplicateService.CheckForDuplicatesAsync(dto.Title, dto.Description);
        return Ok(result);
    }
}
