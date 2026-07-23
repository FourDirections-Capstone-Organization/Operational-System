using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/admin/expert-system")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public class ExpertSystemConfigController : ControllerBase
{
    private readonly IExpertSystemConfigStore _configStore;

    public ExpertSystemConfigController(IExpertSystemConfigStore configStore)
    {
        _configStore = configStore;
    }

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        var config = _configStore.GetConfig();
        return Ok(ApiResponseDTO<ExpertSystemConfig>.Success(config));
    }

    [HttpPut("config")]
    public IActionResult UpdateConfig([FromBody] ExpertSystemConfig newConfig)
    {
        var sum = newConfig.WorkloadWeight + newConfig.ExperienceWeight + newConfig.RecScoreWeight;
        if (Math.Abs(sum - 1.0) > 0.05)
            return BadRequest(ApiResponseDTO<object>.Failure(
                $"Weights must sum to approximately 1.0 (current sum: {Math.Round(sum, 4)})"));

        if (newConfig.MaxWorkload < 1)
            return BadRequest(ApiResponseDTO<object>.Failure("MaxWorkload must be at least 1"));

        if (newConfig.MaxXP < 1)
            return BadRequest(ApiResponseDTO<object>.Failure("MaxXP must be at least 1"));

        if (newConfig.WorkloadWeight < 0 || newConfig.ExperienceWeight < 0 || newConfig.RecScoreWeight < 0)
            return BadRequest(ApiResponseDTO<object>.Failure("Weights cannot be negative"));

        _configStore.UpdateConfig(newConfig);
        return Ok(ApiResponseDTO<ExpertSystemConfig>.Success(newConfig, "Expert system config updated"));
    }
}
