using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Services;

public class DepartmentService : IDepartmentService
{
    private readonly AppDbContext _db;

    public DepartmentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<List<DepartmentResponseDTO>>> GetAllAsync()
    {
        var departments = await _db.Departments
            .Where(d => d.IsActive)
            .Include(d => d.Users)
            .Include(d => d.JobPositions)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentResponseDTO
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                UserCount = d.Users.Count(u => u.IsActive && !u.IsDeactivated),
            })
            .ToListAsync();

            return ApiResponseDTO<List<DepartmentResponseDTO>>.Success(departments);
    }
}
