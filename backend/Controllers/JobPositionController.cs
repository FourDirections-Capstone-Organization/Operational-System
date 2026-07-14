using Backend.Models.DTOs;
using Backend.Modules.OrganizationalStructure;
using Backend.Modules.RoleBasedAccessControl;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/job-positions")]
[Authorize]
public class JobPositionController : ControllerBase
{
    private readonly IJobPositionService _jobPositionService;

    public JobPositionController(IJobPositionService jobPositionService)
    {
        _jobPositionService = jobPositionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] Guid? departmentId = null)
    {
        if (departmentId.HasValue)
        {
            var result = await _jobPositionService.GetByDepartmentAsync(departmentId.Value, pageNumber, pageSize);
            return Ok(result);
        }

        var allResult = await _jobPositionService.GetAllAsync(pageNumber, pageSize);
        return Ok(allResult);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _jobPositionService.GetByIdAsync(id);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> Create(CreateJobPositionDTO dto)
    {
        var result = await _jobPositionService.CreateAsync(dto);
        if (!result.IsSuccess)
            return BadRequest(result);

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> Update(Guid id, UpdateJobPositionDTO dto)
    {
        var result = await _jobPositionService.UpdateAsync(id, dto);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _jobPositionService.DeleteAsync(id);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }

}
