using System.Text.RegularExpressions;

namespace Backend.Modules.Utilities;

public static class PasswordValidator
{
    // OWASP password requirements:
    // - Minimum 15 characters
    // - At least one uppercase letter (A-Z)
    // - At least one lowercase letter (a-z)
    // - At least one digit (0-9)
    // - At least one special character (!@#$%^&* etc.)

    public const int MIN_LENGTH = 15;

    public static (bool IsValid, List<string> Errors) Validate(string password)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(password) || password.Length < MIN_LENGTH)
            errors.Add($"Password must be at least {MIN_LENGTH} characters long.");
        
        if (!Regex.IsMatch(password ?? "", @"[A-Z]"))
            errors.Add("Password must contain at least one uppercase letter (A-Z).");
        
        if (!Regex.IsMatch(password ?? "", @"[a-z]"))
            errors.Add("Password must contain at least one lowercase letter (a-z).");

        if (!Regex.IsMatch(password ?? "", @"[0-9]"))
            errors.Add("Password must contain at least one number (0-9).");

        if (!Regex.IsMatch(password ?? "", @"[!@#$%^&*()_+\-=\[\]{};':"",.<>?/\\|`~]"))
            errors.Add("Password must contain at least one special character.");
        
        return (errors.Count == 0, errors);
    }
}
