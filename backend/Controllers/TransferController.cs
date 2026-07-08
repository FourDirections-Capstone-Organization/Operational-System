using Backend.Models.DTOs;
using Backend.Modules.OrganizationalStructure;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/controller")]
public class TransferController : ControllerBase
{
    private readonly ITransferService _transferService;

    public TransferController(ITransferService transferService)
    {
        _transferService = transferService;
    }

    [HttpPost("{userId:guid}")]
    public async Task<IActionResult> TransferUser(Guid userId, TransferUserDTO dto)
    {
        var result = await _transferService.TransferUserAsync(userId, dto);
        if (!result.IsSuccess)
        {
            if(result.Message.Contains("not found"))
                return NotFound(result);

            return BadRequest(result);
        }

        return Ok(result);
    }

}
