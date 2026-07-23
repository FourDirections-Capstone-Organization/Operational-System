using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Modules.Analytics;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/analytics/trends")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public class AnalyticsTrendController : ControllerBase
{
    private readonly ChartDataService _chartService;

    public AnalyticsTrendController(ChartDataService chartService)
    {
        _chartService = chartService;
    }

    [HttpGet("weekly")]
    public async Task<IActionResult> GetWeeklyTrend()
    {
        var result = await _chartService.GetCompletionRateTrendAsync(4);
        return Ok(result);
    }

    [HttpGet("chart/completion-rate")]
    public async Task<IActionResult> GetCompletionRateChartData([FromQuery] int weeks = 4)
    {
        var result = await _chartService.GetCompletionRateTrendAsync(weeks);
        return Ok(result);
    }
}
