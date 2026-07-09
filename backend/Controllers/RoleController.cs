using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.RoleBasedAccessControl;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RoleController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RoleController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var result = _roleService.GetAllRoles();
        return Ok(result);
    }

    [HttpGet("{role}")]
    public IActionResult GetByRole(string role)
    {
        if (!Enum.TryParse<UserRole>(role, true, out var roleEnum))
            return BadRequest(new { message = "Invalid role" });

        var result = _roleService.GetRoleByType(roleEnum);
        return Ok(result);
    }

    
}
