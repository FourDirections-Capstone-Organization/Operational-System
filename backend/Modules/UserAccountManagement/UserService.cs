using Backend.Data;
using Backend.Models;
using Backend.Modules.Email;
using Backend.Models.DTOs;
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
