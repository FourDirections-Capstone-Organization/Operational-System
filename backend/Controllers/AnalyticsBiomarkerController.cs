using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/analytics/biomarker")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public class AnalyticsBiomarkerController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsBiomarkerController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("latest")]
    public async Task<IActionResult> GetLatestBiomarkerResults()
    {
        var alerts = await _db.BiomarkerAlerts
            .OrderByDescending(a => a.ScanDateTime)
            .Take(50)
            .ToListAsync();

        return Ok(alerts);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetBiomarkerHistory([FromQuery] DateTime? from, [FromQuery] DateTime? to)
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
}
