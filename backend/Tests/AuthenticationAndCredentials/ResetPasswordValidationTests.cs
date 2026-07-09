using Backend.Modules.Utilities;
using Xunit;

namespace Backend.Tests;

public class ResetPasswordValidationTests
{
    [Fact]
    public void ResetPassword_NewPasswordTooShort_FailsValidation()
    {
        var (isValid, errors) = PasswordValidator.Validate("Ab1!");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("15 characters"));
    }

    [Fact]
    public void ResetPassword_NewPasswordMissingUppercase_FailsValidation()
    {
        var (isValid, errors) = PasswordValidator.Validate("abcdefghijk1!@#");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("uppercase"));
    }

    [Fact]
    public void ResetPassword_ValidNewPassword_PassesValidation()
    {
        var (isValid, errors) = PasswordValidator.Validate("MyNewStr0ng!Pass#2024");

        Assert.True(isValid);
        Assert.Empty(errors);
    }
}