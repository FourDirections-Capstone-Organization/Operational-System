using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [Authorize]
    [HttpGet]
    public async Task<ActionResult<ApiResponseDTO<List<Product>>>> GetAll()
    {
        var result = await _productService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ApiResponseDTO<Product>>> GetById(int id)
    {
        var result = await _productService.GetByIdAsync(id);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponseDTO<Product>>> Create(Product product)
    {
        var result = await _productService.CreateAsync(product);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, result);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponseDTO<Product>>> Update(int id, Product product)
    {
        var result = await _productService.UpdateAsync(id, product);
        if (!result.IsSuccess)
        {
            if (result.Message == "ID mismatch")
                return BadRequest(result);

            return NotFound(result);
        }

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponseDTO<bool>>> Delete(int id)
    {
        var result = await _productService.DeleteAsync(id);
        if (!result.IsSuccess)
            return NotFound(result);

        return Ok(result);
    }
}
