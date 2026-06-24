using Backend.Models;

namespace Backend.Services;

public interface IProductService
{
    Task<ApiResponseDTO<List<Product>>> GetAllAsync();
    Task<ApiResponseDTO<Product>> GetByIdAsync(int id);
    Task<ApiResponseDTO<Product>> CreateAsync(Product product);
    Task<ApiResponseDTO<Product>> UpdateAsync(int id, Product product);
    Task<ApiResponseDTO<bool>> DeleteAsync(int id);
}
