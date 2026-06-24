using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _db;

    public ProductService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<List<Product>>> GetAllAsync()
    {
        var products = await _db.Products.OrderBy(p => p.Id).ToListAsync();
        return ApiResponseDTO<List<Product>>.Success(products);
    }

    public async Task<ApiResponseDTO<Product>> GetByIdAsync(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null)
            return ApiResponseDTO<Product>.Failure("Product not found");

        return ApiResponseDTO<Product>.Success(product);
    }

    public async Task<ApiResponseDTO<Product>> CreateAsync(Product product)
    {
        product.CreatedAt = DateTime.UtcNow;
        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return ApiResponseDTO<Product>.Success(product, "Product created successfully");
    }

    public async Task<ApiResponseDTO<Product>> UpdateAsync(int id, Product product)
    {
        if (id != product.Id)
            return ApiResponseDTO<Product>.Failure("ID mismatch");

        var existing = await _db.Products.FindAsync(id);
        if (existing is null)
            return ApiResponseDTO<Product>.Failure("Product not found");

        existing.Name = product.Name;
        existing.Description = product.Description;
        existing.Price = product.Price;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<Product>.Success(existing, "Product updated successfully");
    }

    public async Task<ApiResponseDTO<bool>> DeleteAsync(int id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null)
            return ApiResponseDTO<bool>.Failure("Product not found");

        _db.Products.Remove(product);
        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true, "Product deleted successfully");
    }
}
