using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.OrganizationalStructure;

public class DepartmentService : IDepartmentService
{
    private readonly AppDbContext _db;

    public DepartmentService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<PaginatedResponseDTO<DepartmentResponseDTO>>> GetAllAsync(int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Departments
            .Where(d => d.IsActive)
            .Include(d => d.Users)
            .Include(d => d.JobPositions);

        var totalCount = await query.CountAsync();

        var departments = await query
            .OrderBy(d => d.Name)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new DepartmentResponseDTO
            {
                Id = d.Id,
                Name = d.Name,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt,
                UserCount = d.Users.Count(u => u.IsActive && !u.IsDeactivated),
                PositionCount = d.JobPositions.Count(jp => jp.IsActive)
            })
            .ToListAsync();

            var paginatedResult = new PaginatedResponseDTO<DepartmentResponseDTO>
            {
                Items = departments,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };

            return ApiResponseDTO<PaginatedResponseDTO<DepartmentResponseDTO>>.Success(paginatedResult);
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

    public async Task<ApiResponseDTO<bool>> DeleteAsync(Guid id)
    {
        var department = await _db.Departments
            .Include(d => d.Users)
            .FirstOrDefaultAsync(d => d.Id == id);
        
        if (department is null)
            return ApiResponseDTO<bool>.Failure("Department not found");
        
        if (!department.IsActive)   
            return ApiResponseDTO<bool>.Failure("Department is already inactive");

        // Check if the department has active users
        var hasActiveUsers = department.Users.Any(u => u.IsActive && !u.IsDeactivated);
        if (hasActiveUsers)
            return ApiResponseDTO<bool>.Failure("Cannot delete department with active users. Transfer users first.");
        
        // Soft delete
        department.IsActive = false;
        department.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true, "Department deactivated successfully");
    }

    public async System.Threading.Tasks.Task SeedDefaultDepartmentsAsync()
    {
        // Migrate old department names to new ones, handling duplicates
        var oldToNew = new Dictionary<string, string>
        {
            ["Coordinator & Customer Service Team"] = "Coordinator and Customer Service Team",
            ["Forwarding Team (Vismin Airline Cargo Forwarders)"] = "Forwarding and Delivery Team"
        };

        foreach (var kvp in oldToNew)
        {
            var oldDept = await _db.Departments.FirstOrDefaultAsync(d => d.Name == kvp.Key);
            var newDept = await _db.Departments.FirstOrDefaultAsync(d => d.Name == kvp.Value);

            if (oldDept is not null && newDept is not null)
            {
                // Both exist — reassign users and positions, then remove old
                var usersInOld = await _db.Users.Where(u => u.DepartmentId == oldDept.Id).ToListAsync();
                foreach (var user in usersInOld)
                    user.DepartmentId = newDept.Id;

                var positionsInOld = await _db.JobPositions.Where(p => p.DepartmentId == oldDept.Id).ToListAsync();
                foreach (var pos in positionsInOld)
                    pos.DepartmentId = newDept.Id;

                _db.Departments.Remove(oldDept);
            }
            else if (oldDept is not null)
            {
                // Only old exists — rename it
                oldDept.Name = kvp.Value;
                oldDept.UpdatedAt = DateTime.UtcNow;
            }
        }

        var defaultDepartments = new[]
        {
            new { Name = "Coordinator and Customer Service Team", Description = "Handles customer coordination and service operations" },
            new { Name = "Dispatch Team", Description = "Manages dispatch operations and logistics" },
            new { Name = "Forwarding and Delivery Team", Description = "Handles forwarding and delivery operations" },
            new { Name = "Accounting Team", Description = "Manages financial and accounting operations" }
        };

        foreach (var dept in defaultDepartments)
        {
            var exists = await _db.Departments
                .AnyAsync(d => d.Name.ToLower() == dept.Name.ToLower());

            if (!exists)
            {
                _db.Departments.Add(new Department
                {
                   Name = dept.Name,
                   Description = dept.Description,
                   IsActive = true,
                   CreatedAt = DateTime.UtcNow 
                });
            }
        }

        await _db.SaveChangesAsync();
    }

    public async System.Threading.Tasks.Task SeedDefaultPositionsAsync()
    {
        var departments = await _db.Departments.ToListAsync();

        var defaultPositions = new[]
        {
            // Coordinator and Customer Service Team
            new { Name = "Operational Manager", DeptName = "Coordinator and Customer Service Team" },

            // Dispatch Team
            new { Name = "Operational Admin", DeptName = "Dispatch Team" },
            new { Name = "Operational Team", DeptName = "Dispatch Team" },

            // Forwarding and Delivery Team
            new { Name = "Operational Admin", DeptName = "Forwarding and Delivery Team" },
            new { Name = "Operational Team", DeptName = "Forwarding and Delivery Team" },

            // Accounting Team (org chart only, no STARS access)
            new { Name = "Finance Manager", DeptName = "Accounting Team" },
            new { Name = "Head Accountant", DeptName = "Accounting Team" },
            new { Name = "Accountant", DeptName = "Accounting Team" },
            new { Name = "Assistant of Finance Manager", DeptName = "Accounting Team" }
        };

        foreach (var pos in defaultPositions)
        {
            var dept = departments.FirstOrDefault(d => d.Name == pos.DeptName);
            if (dept is null) continue;

            var exists = await _db.JobPositions
                .AnyAsync(jp => jp.Name.ToLower() == pos.Name.ToLower() && jp.DepartmentId == dept.Id);

            if (!exists)
            {
                _db.JobPositions.Add(new JobPosition
                {
                    Name = pos.Name,
                    DepartmentId = dept.Id,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        await _db.SaveChangesAsync();
    }
}
