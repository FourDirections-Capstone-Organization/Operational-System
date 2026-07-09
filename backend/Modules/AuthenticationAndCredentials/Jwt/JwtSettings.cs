namespace Backend.Modules.AuthenticationAndCredentials.Jwt;

public class JwtSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;
    public int ExpirationInMinutes { get; set; } = 15;
    public int RefreshTokenExpirationInDays { get; set; } = 7;
}

public class SessionSettings
{
    public int InactivityTimeoutInMinutes { get; set; } = 15;
}