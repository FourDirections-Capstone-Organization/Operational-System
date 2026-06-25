using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Backend.Data;
using Backend.Models;
using Backend.Modules.Authentication.DTO;

namespace Backend.Modules.Authentication;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var emailExists = await _db.Employees.AnyAsync(e => e.Email == request.Email);
        if (emailExists)
            return Error("Email is already registered.");

        var empIdExists = await _db.Employees.AnyAsync(e => e.EmployeeID == request.EmployeeID);
        if (empIdExists)
            return Error("Employee ID is already taken.");

        var employee = new Employee
        {
            FirstName = request.FirstName,
            MiddleName = request.MiddleName,
            LastName = request.LastName,
            Suffix = request.Suffix,
            Email = request.Email,
            EmployeeID = request.EmployeeID,
            ContactNumber = request.ContactNumber,
            Gender = request.Gender,
        };

        var passwordHasher = new PasswordHasher<Account>();
        var account = new Account
        {
            EmployeeId = employee.Id,
            PasswordHash = passwordHasher.HashPassword(null!, request.Password),
            Role = "Employee",
        };

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            _db.Employees.Add(employee);
            await _db.SaveChangesAsync();

            _db.Accounts.Add(account);
            await _db.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            return Error("Registration failed. Please try again.");
        }

        return await GenerateAuthResponse(employee, account);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var employee = await _db.Employees
            .Include(e => e.Account)
            .FirstOrDefaultAsync(e => e.EmployeeID == request.EmployeeNumber);

        if (employee?.Account is null)
            return Error("Invalid credentials.");

        var passwordHasher = new PasswordHasher<Account>();
        var result = passwordHasher.VerifyHashedPassword(
            employee.Account, employee.Account.PasswordHash, request.Password);

        if (result == PasswordVerificationResult.Failed)
            return Error("Invalid credentials.");

        await RevokeExistingRefreshTokens(employee.Account.Id);

        return await GenerateAuthResponse(employee, employee.Account);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var refreshToken = await _db.RefreshTokens
            .Include(rt => rt.Account)
                .ThenInclude(a => a.Employee)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken);

        if (refreshToken is null || refreshToken.IsRevoked || refreshToken.ExpiresAt < DateTime.UtcNow)
            return Error("Invalid or expired refresh token.");

        refreshToken.IsRevoked = true;
        await _db.SaveChangesAsync();

        return await GenerateAuthResponse(refreshToken.Account.Employee, refreshToken.Account);
    }

    private async Task<AuthResponse> GenerateAuthResponse(Employee employee, Account account)
    {
        var accessToken = GenerateAccessToken(employee, account);
        var (refreshTokenValue, expiresAt) = await CreateRefreshToken(account.Id);
        var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(
            double.Parse(_configuration["Jwt:AccessTokenExpirationMinutes"] ?? "15"));

        var fullName = string.Join(" ",
            new[] { employee.FirstName, employee.MiddleName, employee.LastName, employee.Suffix }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

        return new AuthResponse
        {
            IsSuccess = true,
            Message = "Success",
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            ExpiresAt = accessTokenExpiresAt,
            Role = account.Role,
            EmployeeName = fullName,
            EmployeeID = employee.EmployeeID,
            IsPasswordChanged = account.UpdatedAt.HasValue,
            FirstName = employee.FirstName,
            MiddleName = employee.MiddleName,
            LastName = employee.LastName,
            Suffix = employee.Suffix,
            ContactNumber = employee.ContactNumber,
            Email = employee.Email,
        };
    }

    private string GenerateAccessToken(Employee employee, Account account)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expiration = DateTime.UtcNow.AddMinutes(
            double.Parse(_configuration["Jwt:AccessTokenExpirationMinutes"] ?? "15"));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new Claim(ClaimTypes.Email, employee.Email),
            new Claim(ClaimTypes.Role, account.Role),
            new Claim("employeeId", employee.EmployeeID),
            new Claim(ClaimTypes.Name, $"{employee.FirstName} {employee.LastName}"),
            new Claim(ClaimTypes.GivenName, employee.FirstName),
            new Claim("lastName", employee.LastName),
            new Claim("employeeNumber", employee.EmployeeID),
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: expiration,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private async Task<(string token, DateTime expiresAt)> CreateRefreshToken(Guid accountId)
    {
        var expiresAt = DateTime.UtcNow.AddDays(
            double.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7"));

        var randomBytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var tokenValue = Convert.ToBase64String(randomBytes);

        var refreshToken = new RefreshToken
        {
            AccountId = accountId,
            Token = tokenValue,
            ExpiresAt = expiresAt,
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        return (tokenValue, expiresAt);
    }

    private async Task RevokeExistingRefreshTokens(Guid accountId)
    {
        var activeTokens = await _db.RefreshTokens
            .Where(rt => rt.AccountId == accountId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var token in activeTokens)
            token.IsRevoked = true;

        await _db.SaveChangesAsync();
    }

    private static AuthResponse Error(string message)
    {
        return new AuthResponse { IsSuccess = false, Message = message };
    }
}
