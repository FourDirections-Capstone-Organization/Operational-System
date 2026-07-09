using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Backend.Models;
using Backend.Models.Enums;
using Xunit;

namespace Backend.Tests;

public class JwtTokenTests
{
    private readonly string _secretKey = "YourSuperSecretKeyAtLeast32CharactersLong!ChangeThisInProduction";
    private readonly string _issuer = "STARS.API";
    private readonly string _audience = "STARS.Client";
    private readonly int _expirationInMinutes = 15;

    private string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_secretKey);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("EmployeeNumber", user.EmployeeNumber),
            new Claim("FullName", $"{user.FirstName} {user.LastName}".Trim())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_expirationInMinutes),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    [Fact]
    public void GenerateJwtToken_ContainsCorrectClaims()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "john@speedex.com",
            Role = UserRole.Manager,
            EmployeeNumber = "0001",
            FirstName = "John",
            LastName = "Doe"
        };

        var token = GenerateJwtToken(user);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Contains(jwt.Claims, c => c.Type == "nameid" && c.Value == user.Id.ToString());
        Assert.Contains(jwt.Claims, c => c.Type == "email" && c.Value == "john@speedex.com");
        Assert.Contains(jwt.Claims, c => c.Type == "role" && c.Value == "Manager");
        Assert.Contains(jwt.Claims, c => c.Type == "EmployeeNumber" && c.Value == "0001");
        Assert.Contains(jwt.Claims, c => c.Type == "FullName" && c.Value == "John Doe");
    }

    [Fact]
    public void GenerateJwtToken_ExpirationMatchesConfig()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "test@test.com", Role = UserRole.Encoder, EmployeeNumber = "0001", FirstName = "Test", LastName = "User" };
        var beforeGenerate = DateTime.UtcNow;

        var token = GenerateJwtToken(user);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        var expectedExpiry = beforeGenerate.AddMinutes(_expirationInMinutes);
        Assert.True(jwt.ValidTo >= expectedExpiry.AddSeconds(-2));
        Assert.True(jwt.ValidTo <= expectedExpiry.AddSeconds(2));
    }

    [Fact]
    public void GenerateJwtToken_IssuerMatchesConfig()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "test@test.com", Role = UserRole.Encoder, EmployeeNumber = "0001", FirstName = "Test", LastName = "User" };

        var token = GenerateJwtToken(user);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal(_issuer, jwt.Issuer);
    }

    [Fact]
    public void GenerateJwtToken_AudienceMatchesConfig()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "test@test.com", Role = UserRole.Encoder, EmployeeNumber = "0001", FirstName = "Test", LastName = "User" };

        var token = GenerateJwtToken(user);
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Contains(_audience, jwt.Audiences);
    }

    [Fact]
    public void GenerateJwtToken_IsValidatable()
    {
        var user = new User { Id = Guid.NewGuid(), Email = "test@test.com", Role = UserRole.Encoder, EmployeeNumber = "0001", FirstName = "Test", LastName = "User" };

        var token = GenerateJwtToken(user);
        var handler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_secretKey);

        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = _issuer,
            ValidAudience = _audience,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = TimeSpan.Zero
        };

        var principal = handler.ValidateToken(token, validationParameters, out _);
        Assert.NotNull(principal);
    }
}