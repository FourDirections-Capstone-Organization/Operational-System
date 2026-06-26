namespace Backend.Modules.Authentication.DTO;

public class AuthResponse
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? Role { get; set; }
    public string? EmployeeName { get; set; }
    public string? EmployeeID { get; set; }
    public bool IsPasswordChanged { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? Suffix { get; set; }
    public string? ContactNumber { get; set; }
    public string? Email { get; set; }
}
