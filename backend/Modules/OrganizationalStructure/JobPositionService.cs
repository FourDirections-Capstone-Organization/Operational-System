using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Backend.Modules.OrganizationalStructure;

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

    public async Task<ApiResponseDTO<JobPositionResponseDTO>> CreateAsync(CreateJobPositionDTO dto)
    {
        // Check if department exists
        var departmentExists = await _db.Departments
            .AnyAsync(d => d.Id == dto.DepartmentId && d.IsActive);

        if (!departmentExists)
            return ApiResponseDTO<JobPositionResponseDTO>.Failure("Department not found or is inactive");

        // Check if position with same name exists in the same department
        var exists = await _db.JobPositions
            .AnyAsync(jp => jp.DepartmentId == dto.DepartmentId 
                && jp.Name.ToLower() == dto.Name.ToLower() 
                && jp.IsActive);

        if (exists)
            return ApiResponseDTO<JobPositionResponseDTO>.Failure("Job position with this name already exists in this department");

        var position = new JobPosition
        {
            Name = dto.Name,
            DepartmentId = dto.DepartmentId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.JobPositions.Add(position);
        await _db.SaveChangesAsync();

        // Reload with department info
        await _db.Entry(position).Reference(p => p.Department).LoadAsync();

        var response = new JobPositionResponseDTO
        {
            Id = position.Id,
            Name = position.Name,
            DepartmentId = position.DepartmentId,
            DepartmentName = position.Department?.Name,
            IsActive = position.IsActive,
            CreatedAt = position.CreatedAt,
            UserCount = 0  
        };

        return ApiResponseDTO<JobPositionResponseDTO>.Success(response, "Job position created successfully");
    }

    public async Task<ApiResponseDTO<JobPositionResponseDTO>> UpdateAsync(Guid id, UpdateJobPositionDTO dto)
    {
        var position = await _db.JobPositions
            .Include(jp => jp.Department)
            .Include(jp => jp.Users)
            .FirstOrDefaultAsync(jp => jp.Id == id && jp.IsActive);

        if (position is null)
            return ApiResponseDTO<JobPositionResponseDTO>.Failure("Job position not found");

        // Check if the new department exists
        var departmentExists = await _db.Departments
            .AnyAsync(d => d.Id == dto.DepartmentId && d.IsActive);

        if (!departmentExists)
            return ApiResponseDTO<JobPositionResponseDTO>.Failure("Department not found or is inactive");

        // Check if new name conflicts
        var nameConflict = await _db.JobPositions
            .AnyAsync(jp => jp.Id != id 
                && jp.DepartmentId == dto.DepartmentId 
                && jp.Name.ToLower() == dto.Name.ToLower() 
                && jp.IsActive);

        if (nameConflict)
            return ApiResponseDTO<JobPositionResponseDTO>.Failure("Job position with this name already exists in this department");

        position.Name = dto.Name;
        position.DepartmentId = dto.DepartmentId;
        position.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        // Reload the department info
        await _db.Entry(position).Reference(p => p.Department).LoadAsync();

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

        return ApiResponseDTO<JobPositionResponseDTO>.Success(response, "Job position updated successfully");
    }

    public async Task<ApiResponseDTO<bool>> DeleteAsync(Guid id)
    {
        var position = await _db.JobPositions
            .Include(jp => jp.Users)
            .FirstOrDefaultAsync(jp => jp.Id == id);
        
        if (position is null)
            return ApiResponseDTO<bool>.Failure("Job position not found");
        
        if (!position.IsActive)
            return ApiResponseDTO<bool>.Failure("Job position is already inactive");
        
        // Check if the position has active users
        var hasActiveUsers = position.Users.Any(u => u.IsActive && !u.IsDeactivated);
        if(hasActiveUsers)
            return ApiResponseDTO<bool>.Failure("Cannot delete job position with active users. Transfer users first.");

        // Soft delete
        position.IsActive = false;
        position.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true, "Job position deactivated successfully");
    }
}
