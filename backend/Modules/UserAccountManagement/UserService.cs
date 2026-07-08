using Backend.Data;
using Backend.Models;
using Backend.Modules.Email;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

namespace Backend.Modules.UserAccountManagement;

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<UserService> _logger;

    public UserService(AppDbContext db, IEmailService emailService, ILogger<UserService> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<ApiResponseDTO<UserResponseDTO>> RegisterAsync(RegisterUserDTO dto)
    {
        // Check if employee number already exists
        var empNumExists = await _db.Users
            .AnyAsync(u => u.EmployeeNumber == dto.EmployeeNumber);

        if (empNumExists)
            return ApiResponseDTO<UserResponseDTO>.Failure("Employee number already exists");

        // Check if email already exists
        var emailExists = await _db.Users
            .AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower());

        if (emailExists)
            return ApiResponseDTO<UserResponseDTO>.Failure("Email already exists");

        // Validate department if provided
        if (dto.DepartmentId.HasValue)
        {
            var deptExists = await _db.Departments
                .AnyAsync(d => d.Id == dto.DepartmentId.Value && d.IsActive);

            if (!deptExists)
                return ApiResponseDTO<UserResponseDTO>.Failure("Department not found or is inactive");
        }

        // Validate job position if provided
        if (dto.JobPositionId.HasValue)
        {
            var posExists = await _db.JobPositions
                .AnyAsync(jp => jp.Id == dto.JobPositionId.Value && jp.IsActive);

            if (!posExists)
                return ApiResponseDTO<UserResponseDTO>.Failure("Job position not found or is inactive");
        }

        // Create user object first
        var user = new User
        {
            EmployeeNumber = dto.EmployeeNumber,
            Email = dto.Email,
            FirstName = dto.FirstName,
            MiddleName = dto.MiddleName,
            LastName = dto.LastName,
            Suffix = dto.Suffix,
            ContactNumber = dto.ContactNumber,
            Role = dto.Role,
            DepartmentId = dto.DepartmentId,
            JobPositionId = dto.JobPositionId,
            IsActive = true,
            IsDeactivated = false,
            IsEmailVerified = false,
            IsPasswordChanged = false,
            CreatedAt = DateTime.UtcNow
        };

        // Generate temporary password (OWASP compliant: 15+ chars, upper, lower, number, special)
        var tempPassword = GenerateTempPassword();
        var passwordHasher = new PasswordHasher<User>();
        user.PasswordHash = passwordHasher.HashPassword(user, tempPassword);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Load related data for response
        await _db.Entry(user).Reference(u => u.Department).LoadAsync();
        await _db.Entry(user).Reference(u => u.JobPosition).LoadAsync();

        // Send welcome email with credentials
        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        await _emailService.SendWelcomeEmailAsync(user.Email, fullName, user.EmployeeNumber, tempPassword);

        _logger.LogInformation("New user registered: {EmployeeNumber} - {Email}", user.EmployeeNumber, user.Email);

        var response = MapToResponseDTO(user);
        return ApiResponseDTO<UserResponseDTO>.Success(response, "User registered successfully. Welcome email sent.");
    }

    public async Task<ApiResponseDTO<List<UserResponseDTO>>> GetAllAsync(string? search = null, string? role = null, Guid? departmentId = null)
    {
        var query = _db.Users
            .Include(u => u.Department)
            .Include(u => u.JobPosition)
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(u =>
                u.FirstName.ToLower().Contains(searchLower) ||
                u.LastName.ToLower().Contains(searchLower) ||
                u.Email.ToLower().Contains(searchLower) ||
                u.EmployeeNumber.ToLower().Contains(searchLower));
        }

        if (!string.IsNullOrWhiteSpace(role) && Enum.TryParse<UserRole>(role, true, out var roleEnum))
        {
            query = query.Where(u => u.Role == roleEnum);
        }

        if (departmentId.HasValue)
        {
            query = query.Where(u => u.DepartmentId == departmentId.Value);
        }

        var users = await query
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync();

        var response = users.Select(MapToResponseDTO).ToList();

        return ApiResponseDTO<List<UserResponseDTO>>.Success(response);
    }

    public async Task<ApiResponseDTO<UserResponseDTO>> GetByIdAsync(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.JobPosition)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return ApiResponseDTO<UserResponseDTO>.Failure("User not found");

        var response = MapToResponseDTO(user);
        return ApiResponseDTO<UserResponseDTO>.Success(response);
    }

    public async Task<ApiResponseDTO<UserResponseDTO>> GetByEmployeeNumberAsync(string employeeNumber)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.JobPosition)
            .FirstOrDefaultAsync(u => u.EmployeeNumber == employeeNumber);

        if (user is null)
            return ApiResponseDTO<UserResponseDTO>.Failure("User not found");

        var response = MapToResponseDTO(user);
        return ApiResponseDTO<UserResponseDTO>.Success(response);
    }

    public async Task<ApiResponseDTO<UserResponseDTO>> UpdateAsync(Guid id, UpdateUserDTO dto, Guid? requestUserId = null)
    {
        var user = await _db.Users
            .Include(u => u.Department)
            .Include(u => u.JobPosition)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user is null)
            return ApiResponseDTO<UserResponseDTO>.Failure("User not found");

        // Check if user is deactivated
        if (user.IsDeactivated)
            return ApiResponseDTO<UserResponseDTO>.Failure("Cannot update a deactivated user");

        // Check permissions: only Manager or the user themselves can update
        if (!requestUserId.HasValue)
            return ApiResponseDTO<UserResponseDTO>.Failure("Authentication required");
        
        if (requestUserId != id)
        {
            var requestUser = await _db.Users.FindAsync(requestUserId.Value);
            if (requestUser is null || requestUser.Role != UserRole.Manager)
                return ApiResponseDTO<UserResponseDTO>.Failure("You don't have permission to update this user");
        }

        // Check email uniqueness if changing
        if (!string.IsNullOrWhiteSpace(dto.Email) && dto.Email.ToLower() != user.Email.ToLower())
        {
            var emailExists = await _db.Users
                .AnyAsync(u => u.Id != id && u.Email.ToLower() == dto.Email.ToLower());

            if (emailExists)
                return ApiResponseDTO<UserResponseDTO>.Failure("Email already exists");

            user.Email = dto.Email;
            user.IsEmailVerified = false; // Reset verification if email changed
        }

        // Update fields
        if (!string.IsNullOrWhiteSpace(dto.FirstName))
            user.FirstName = dto.FirstName;

        if (dto.MiddleName != null)
            user.MiddleName = dto.MiddleName;

        if (!string.IsNullOrWhiteSpace(dto.LastName))
            user.LastName = dto.LastName;

        if (dto.Suffix != null)
            user.Suffix = dto.Suffix;

        if (dto.ContactNumber != null)
            user.ContactNumber = dto.ContactNumber;

        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var response = MapToResponseDTO(user);
        return ApiResponseDTO<UserResponseDTO>.Success(response, "User updated successfully");
    }

    public async Task<ApiResponseDTO<bool>> DeactivateAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);

        if (user is null)
            return ApiResponseDTO<bool>.Failure("User not found");

        if (user.IsDeactivated)
            return ApiResponseDTO<bool>.Failure("User is already deactivated");

        // Soft deactivate
        user.IsDeactivated = true;
        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("User deactivated: {EmployeeNumber}", user.EmployeeNumber);

        return ApiResponseDTO<bool>.Success(true, "User deactivated successfully. Historical data preserved.");
    }

    private string GenerateTempPassword()
    {
        // Generate OWASP-compliant temporary password (15+ chars, upper, lower, number, special)
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%^&*";

        var random = new Random();
        var password = new char[16]; // 16 characters to exceed OWASP minimum of 15.

        // Ensure that at least one of each required type (OWASP Compliance)
        password[0] = upper[random.Next(upper.Length)];
        password[1] = lower[random.Next(lower.Length)];
        password[2] = digits[random.Next(digits.Length)];
        password[3] = special[random.Next(special.Length)];

        // Fill the rest randomly from all character types
        const string allChars = upper + lower + digits + special;
        for (int i = 4; i < 16; i++)
        {
            password[i] = allChars[random.Next(allChars.Length)];
        }

        // Shuffle the password to randomize positions
        var shuffledPassword = password.OrderBy(_ => random.Next()).ToArray(); // Temporary
        
        return new string(shuffledPassword); 
    }

    private UserResponseDTO MapToResponseDTO(User user)
    {
        return new UserResponseDTO
        {
            Id = user.Id,
            EmployeeNumber = user.EmployeeNumber,
            Username = user.Username,
            Email = user.Email,
            FirstName = user.FirstName,
            MiddleName = user.MiddleName,
            LastName = user.LastName,
            Suffix = user.Suffix,
            ContactNumber = user.ContactNumber,
            Role = user.Role,
            DepartmentId = user.DepartmentId,
            DepartmentName = user.Department?.Name,
            JobPositionId = user.JobPositionId,
            JobPositionName = user.JobPosition?.Name,
            IsActive = user.IsActive,
            IsDeactivated = user.IsDeactivated,
            IsEmailVerified = user.IsEmailVerified,
            IsPasswordChanged = user.IsPasswordChanged,
            CreatedAt = user.CreatedAt,
            FullName = $"{user.FirstName} {user.MiddleName} {user.LastName} {user.Suffix}"
                .Replace("  ", " ").Trim()
        };
}
