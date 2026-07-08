using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services.OrganizationalStructure;

public class JobPositionService : IJobPositionService
{
    private readonly AppDbContext _db;

    public JobPositionService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<List<JobPositionResponseDTO>>> GetAllAsync()
    {
        var positions = await _db.JobPositions
            .Where(jp => jp.IsActive)
            .Include(jp => jp.Department)
            .Include(jp => jp.Users)
            .OrderBy(jp => jp.Name)
            .Select(jp => new JobPositionResponseDTO
            {
                Id = jp.Id,
                Name = jp.Name,
                DepartmentId = jp.DepartmentId,
                DepartmentName = jp.Department != null ? jp.Department.Name : null,
                IsActive = jp.IsActive,
                CreatedAt = jp.CreatedAt,
                UserCount = jp.Users.Count(u => u.IsActive && !u.IsDeactivated)
            })
            .ToListAsync();

        return ApiResponseDTO<List<JobPositionResponseDTO>>.Success(positions);
    }

    public async Task<ApiResponseDTO<List<JobPositionResponseDTO>>> GetByDepartmentAsync(Guid departmentId)
    {
        var positions = await _db.JobPositions
            .Where(jp => jp.DepartmentId == departmentId && jp.IsActive)
            .Include(jp => jp.Department)
            .Include(jp => jp.Users)
            .OrderBy(jp => jp.Name)
            .Select(jp => new JobPositionResponseDTO
            {
                Id = jp.Id,
                Name = jp.Name,
                DepartmentId = jp.DepartmentId,
                DepartmentName = jp.Department != null ? jp.Department.Name : null,
                IsActive = jp.IsActive,
                CreatedAt = jp.CreatedAt,
                UserCount = jp.Users.Count(u => u.IsActive && !u.IsDeactivated)
            })
            .ToListAsync();

        return ApiResponseDTO<List<JobPositionResponseDTO>>.Success(positions);
    }

    public async Task<ApiResponseDTO<JobPositionResponseDTO>> GetByIdAsync(Guid id)
    {
        var position = await _db.JobPositions
            .Include(jp => jp.Department)
            .Include(jp => jp.Users)
            .FirstOrDefaultAsync(jp => jp.Id == id && jp.IsActive);
        
        if (position is null)
            return ApiResponseDTO<JobPositionResponseDTO>.Failure("Job position not found");
        
        var response = new JobPositionResponseDTO
        {
            Id = position.Id,
            Name = position.Name,
            DepartmentId = position.DepartmentId,
            DepartmentName = position.Department?.Name,
            IsActive = position.IsActive,
            CreatedAt = position.CreatedAt,
            UserCount = position.Users.Count(u => u.IsActive && !u.IsDeactivated)
        };

        return ApiResponseDTO<JobPositionResponseDTO>.Success(response);
    }
}
