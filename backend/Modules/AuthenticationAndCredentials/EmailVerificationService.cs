using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.Email;

namespace Backend.Modules.AuthenticationAndCredentials;

public class EmailVerificationService : IEmailVerificationService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<EmailVerificationService> _logger;

    public EmailVerificationService(
        AppDbContext db,
        IEmailService emailService,
        ILogger<EmailVerificationService> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<ApiResponseDTO<bool>> VerifyEmailAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return ApiResponseDTO<bool>.Failure("Verification token is required.");

        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.EmailVerificationToken == token);

        if (user is null)
            return ApiResponseDTO<bool>.Failure("Verification link has expired or is invalid.");

        if (user.EmailVerificationTokenExpiry.HasValue
            && user.EmailVerificationTokenExpiry.Value < DateTime.UtcNow)
            return ApiResponseDTO<bool>.Failure("Verification link has expired or is invalid.");

        if (user.IsEmailVerified)
            return ApiResponseDTO<bool>.Success(true, "Account is already verified. You may log in.");

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiry = null;
        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("Email verified for user {UserId} ({Email})", user.Id, user.Email);

        return ApiResponseDTO<bool>.Success(true, "Account verified successfully. You may now log in.");
    }

    public async Task<ApiResponseDTO<bool>> ResendVerificationAsync(
        Guid? employeeId, string? email, string verificationUrl)
    {
        User? user = null;

        if (employeeId.HasValue)
        {
            user = await _db.Users.FindAsync(employeeId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(email))
        {
            user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        }

        if (user is null)
            return ApiResponseDTO<bool>.Failure("Employee not found.");

        if (user.IsEmailVerified)
            return ApiResponseDTO<bool>.Failure("Account is already verified.");

        if (user.IsDeactivated)
            return ApiResponseDTO<bool>.Failure("Account is deactivated.");

        var token = GenerateToken();
        user.EmailVerificationToken = token;
        user.EmailVerificationTokenExpiry = DateTime.UtcNow.AddHours(24);
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        await _emailService.SendEmailVerificationAsync(user.Email, fullName, token, verificationUrl);

        _logger.LogInformation("Verification email resent to user {UserId} ({Email})", user.Id, user.Email);

        return ApiResponseDTO<bool>.Success(true, "Verification email resent successfully.");
    }

    public async Task<ApiResponseDTO<EmailVerificationStatusDTO>> GetVerificationStatusAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);

        if (user is null)
            return ApiResponseDTO<EmailVerificationStatusDTO>.Failure("Employee not found.");

        var isTokenExpired = user.EmailVerificationTokenExpiry.HasValue
            && user.EmailVerificationTokenExpiry.Value < DateTime.UtcNow;

        var status = new EmailVerificationStatusDTO
        {
            UserId = user.Id,
            EmployeeName = $"{user.FirstName} {user.LastName}".Trim(),
            Email = user.Email,
            IsEmailVerified = user.IsEmailVerified,
            TokenExpiry = user.EmailVerificationTokenExpiry,
            IsTokenExpired = isTokenExpired,
            Status = user.IsEmailVerified
                ? "Verified"
                : isTokenExpired
                    ? "Token Expired"
                    : user.EmailVerificationToken != null
                        ? "Pending"
                        : "No Token"
        };

        return ApiResponseDTO<EmailVerificationStatusDTO>.Success(status);
    }

    public async System.Threading.Tasks.Task SendVerificationEmailForUserAsync(Guid userId, string verificationUrl)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null)
            return;

        var token = GenerateToken();
        user.EmailVerificationToken = token;
        user.EmailVerificationTokenExpiry = DateTime.UtcNow.AddHours(24);
        await _db.SaveChangesAsync();

        var fullName = $"{user.FirstName} {user.LastName}".Trim();
        await _emailService.SendEmailVerificationAsync(user.Email, fullName, token, verificationUrl);

        _logger.LogInformation("Verification email sent to new user {UserId} ({Email})", user.Id, user.Email);
    }

    private string GenerateToken()
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(tokenBytes).ToLowerInvariant();
    }
}
