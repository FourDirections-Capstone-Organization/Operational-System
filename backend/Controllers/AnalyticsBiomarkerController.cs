using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.Analytics;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/analytics/biomarker")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public class AnalyticsBiomarkerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly BiomarkerScanService _scanService;
    private readonly ILogger<AnalyticsBiomarkerController> _logger;

    public AnalyticsBiomarkerController(AppDbContext db, BiomarkerScanService scanService, ILogger<AnalyticsBiomarkerController> logger)
    {
        _db = db;
        _scanService = scanService;
        _logger = logger;
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestBiomarkerResults([FromQuery] PaginationQueryDTO pagination)
    {
        try
        {
            var query = _db.BiomarkerAlerts
                .OrderByDescending(a => a.ScanDateTime);

            var totalCount = await query.CountAsync();

            var alerts = await query
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            return Ok(new PaginatedResponseDTO<BiomarkerAlert>
            {
                Items = alerts,
                TotalCount = totalCount,
                PageNumber = pagination.PageNumber,
                PageSize = pagination.PageSize
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch latest biomarker alerts");
            return StatusCode(500, new { error = ex.Message, innerError = ex.InnerException?.Message, stackTrace = ex.StackTrace });
        }
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetBiomarkerHistory([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        try
        {
            var query = _db.BiomarkerAlerts.AsQueryable();

            if (from.HasValue)
                query = query.Where(a => a.ScanDateTime >= from.Value);
            if (to.HasValue)
                query = query.Where(a => a.ScanDateTime <= to.Value);

            var alerts = await query
                .OrderByDescending(a => a.ScanDateTime)
                .ToListAsync();

            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch biomarker alert history");
            return StatusCode(500, new { error = ex.Message, innerError = ex.InnerException?.Message });
        }
    }

    [HttpPost("trigger-scan")]
    public async Task<IActionResult> TriggerScan()
    {
        try
        {
            await _scanService.RunBiomarkerScanAsync(DateTime.UtcNow.Date);
            return Ok(new { message = "Biomarker scan triggered successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to trigger biomarker scan");
            return StatusCode(500, new { error = ex.Message, innerError = ex.InnerException?.Message });
        }
    }
}
