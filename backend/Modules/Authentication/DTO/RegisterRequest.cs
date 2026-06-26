namespace Backend.Modules.Authentication.DTO;

public class RegisterRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string? MiddleName { get; set; }
    public string LastName { get; set; } = string.Empty;
    public string? Suffix { get; set; }
    public string Email { get; set; } = string.Empty;
    public string EmployeeID { get; set; } = string.Empty;
    public string ContactNumber { get; set; } = string.Empty;
    public string Gender { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
