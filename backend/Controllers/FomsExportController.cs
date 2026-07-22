using System.Security.Claims;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.RoleBasedAccessControl;
using Backend.Modules.TaskManagement;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/foms")]
[Authorize]
public class FomsExportController : ControllerBase
{
    private readonly IFomsExportService _fomsExportService;
    private readonly AppDbContext _db;

    public FomsExportController(IFomsExportService fomsExportService, AppDbContext db)
    {
        _fomsExportService = fomsExportService;
        _db = db;
    }

    [HttpPost("export")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> Export(
        [FromBody] FomsExportRequestDTO dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var userRoleStr = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var requestUserId))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid user token"));

        if (!Enum.TryParse<UserRole>(userRoleStr, true, out var requestUserRole))
            return Unauthorized(ApiResponseDTO<object>.Failure("Invalid role"));

        Guid? requestUserDepartmentId = null;
        if (requestUserRole == UserRole.Coordinator)
        {
            var user = await _db.Users.FindAsync(requestUserId);
            requestUserDepartmentId = user?.DepartmentId;
        }

        var result = await _fomsExportService.ExportFomsCsvAsync(
            dto.DateRangeStart,
            dto.DateRangeEnd,
            dto.EmployeeId,
            requestUserId,
            requestUserRole,
            requestUserDepartmentId);

        if (!result.IsSuccess)
        {
            if (result.Message.Contains("failed"))
                return StatusCode(500, result);
            return NotFound(result);
        }

        var parts = result.Message.Split('|');
        var fileName = parts.Length > 1 ? parts[1] : "foms_export.csv";
        var contentType = parts.Length > 2 ? parts[2] : "text/csv";

        return File(result.Data!, contentType, fileName);
    }
}
