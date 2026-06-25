namespace Backend.Modules.Authentication.DTO;

public class LoginRequest
{
    public string EmployeeNumber { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
