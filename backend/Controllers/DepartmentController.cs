using Backend.Models.DTOs;
using Backend.Modules.OrganizationalStructure;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DepartmentController : ControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentController(IDepartmentService departmentService)
    {
        _departmentService = departmentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _departmentService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _departmentService.GetByIdAsync(id);
        if(!result.IsSuccess)
            return NotFound(result);
        
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateDepartmentDTO dto)
    {
        var result = await _departmentService.CreateAsync(dto);
        if (!result.IsSuccess)
            return BadRequest(result);
        
        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateDepartmentDTO dto)
    {
        var result = await _departmentService.UpdateAsync(id, dto);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);
            
            return BadRequest(result);
        }

        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _departmentService.DeleteAsync(id);
        if (!result.IsSuccess)
        {
            if (result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }
}
