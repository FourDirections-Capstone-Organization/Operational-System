using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Modules.TaskManagement;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/admin/ml")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public class MlAdminController : ControllerBase
{
    private readonly SlaRiskTrainingService _trainingService;

    public MlAdminController(SlaRiskTrainingService trainingService)
    {
        _trainingService = trainingService;
    }

    [HttpPost("retrain")]
    public async Task<IActionResult> RetrainModel()
    {
        await System.Threading.Tasks.Task.Run(() => _trainingService.RequestRetrain());
        return Ok(ApiResponseDTO<string>.Success("Model retraining started"));
    }
}
