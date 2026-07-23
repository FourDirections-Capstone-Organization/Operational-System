using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Modules.Analytics;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/analytics")]
[Authorize]
public class AnalyticsDashboardController : ControllerBase
{
    private readonly IStreamAnalyticsService _streamService;

    public AnalyticsDashboardController(IStreamAnalyticsService streamService)
    {
        _streamService = streamService;
    }

    [HttpGet("dashboard/department/{deptId:guid}/stream")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> GetDepartmentStreamMetrics(Guid deptId)
    {
        var result = await _streamService.GetDepartmentCompletionRateAsync(deptId);
        return Ok(result);
    }

    [HttpGet("dashboard/overdue")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> GetOverdueAlerts([FromQuery] Guid? departmentId = null)
    {
        var result = await _streamService.GetOverdueAlertsAsync(departmentId);
        return Ok(result);
    }

    [HttpGet("dashboard/workload/stream")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> GetLiveWorkload([FromQuery] Guid departmentId)
    {
        if (departmentId == Guid.Empty)
            return BadRequest("departmentId query parameter is required");

        var result = await _streamService.GetLiveWorkloadAsync(departmentId);
        return Ok(result);
    }
}
