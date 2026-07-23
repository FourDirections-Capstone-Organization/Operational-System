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
    private readonly IRetrainTrigger _retrainTrigger;

    public MlAdminController(IRetrainTrigger retrainTrigger)
    {
        _retrainTrigger = retrainTrigger;
    }

    [HttpPost("retrain")]
    public async Task<IActionResult> RetrainModel()
    {
        await System.Threading.Tasks.Task.Run(() => _retrainTrigger.RequestRetrain());
        return Ok(ApiResponseDTO<string>.Success("Model retraining started"));
    }
}
