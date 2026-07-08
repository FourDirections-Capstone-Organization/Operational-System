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

    public async Task<ApiResponseDTO<DepartmentResponseDTO>> GetByIdAsync(Guid id)
    {
        var department = await _db.Departments
            .Include(d => d.Users)
            .Include(d => d.JobPositions)
            .FirstOrDefaultAsync(d => d.Id == id && d.IsActive);

        if (department is null)
            return ApiResponseDTO<DepartmentResponseDTO>.Failure("Department not found");

        var response = new DepartmentResponseDTO
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            IsActive = department.IsActive,
            CreatedAt = department.CreatedAt,
            UserCount = department.Users.Count(u => u.IsActive && !u.IsDeactivated),
            PositionCount = department.JobPositions.Count(jp => jp.IsActive)
        };

        return ApiResponseDTO<DepartmentResponseDTO>.Success(response);
    }

    public async Task<ApiResponseDTO<DepartmentResponseDTO>> CreateAsync(CreateDepartmentDTO dto)
    {
        // Check if the department with same name already exists
        var exists = await _db.Departments
            .AnyAsync(d => d.Name.ToLower() == dto.Name.ToLower() && d.IsActive);

        if (exists)
            return ApiResponseDTO<DepartmentResponseDTO>.Failure("Department with this name already exists");
        
        var department = new Department
        {
            Name = dto.Name,
            Description = dto.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Departments.Add(department);
        await _db.SaveChangesAsync();

        var response = new DepartmentResponseDTO
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            IsActive = department.IsActive,
            CreatedAt = department.CreatedAt,
            UserCount = 0,
            PositionCount = 0
        };

        return ApiResponseDTO<DepartmentResponseDTO>.Success(response, "Department created successfully");
    }

    public async Task<ApiResponseDTO<DepartmentResponseDTO>> UpdateAsync(Guid id, UpdateDepartmentDTO dto)
    {
        var department = await _db.Departments
            .Include(d => d.Users)
            .Include(d => d.JobPositions)
            .FirstOrDefaultAsync(d => d.Id == id && d.IsActive);
        
        if (department is null)
            return ApiResponseDTO<DepartmentResponseDTO>.Failure("Department not found");
        
        // Check if the new name conflicts with existing department
        var nameConflict = await _db.Departments
            .AnyAsync(d => d.Id != id && d.Name.ToLower() == dto.Name.ToLower() && d.IsActive);

        if (nameConflict)
            return ApiResponseDTO<DepartmentResponseDTO>.Failure("Department with this name already exists.");
        
        department.Name = dto.Name;
        department.Description = dto.Description;
        department.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var response = new DepartmentResponseDTO
        {
            Id = department.Id,
            Name = department.Name,
            Description = department.Description,
            IsActive = department.IsActive,
            CreatedAt = department.CreatedAt,
            UserCount = department.Users.Count(u => u.IsActive && !u.IsDeactivated),
            PositionCount = department.JobPositions.Count(jp => jp.IsActive)
        };

        return ApiResponseDTO<DepartmentResponseDTO>.Success(response, "Department updated successfully");
    }
}
