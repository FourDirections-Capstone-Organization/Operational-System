using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class SlaRiskController : ControllerBase
{
    private readonly ISlaRiskPredictionService _slaRiskService;

    public SlaRiskController(ISlaRiskPredictionService slaRiskService)
    {
        _slaRiskService = slaRiskService;
    }

    [HttpGet("tasks/{taskId:guid}/sla-risk")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetSlaRisk(Guid taskId)
    {
        var result = await _slaRiskService.PredictRiskAsync(taskId);
        return Ok(result);
    }

    [HttpGet("tasks/{taskId:guid}/sla-risk/explain")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetSlaRiskExplanation(Guid taskId)
    {
        var result = await _slaRiskService.ExplainRiskAsync(taskId);
        return Ok(result);
    }
}
