using Backend.Modules.Utilities;
using Xunit;

namespace Backend.Tests.UserAccountManagement;

public class PasswordValidatorTests
{
    [Fact]
    public void Validate_ValidPassword_ReturnsTrue()
    {
        var (isValid, errors) = PasswordValidator.Validate("MyStr0ng!Pass#2024");

        Assert.True(isValid);
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_NullPassword_ReturnsFalseWithAllErrors()
    {
        var (isValid, errors) = PasswordValidator.Validate(null!);

        Assert.False(isValid);
        Assert.Equal(5, errors.Count);
    }

    [Fact]
    public void Validate_EmptyPassword_ReturnsFalseWithAllErrors()
    {
        var (isValid, errors) = PasswordValidator.Validate("");

        Assert.False(isValid);
        Assert.Equal(5, errors.Count);
    }

    [Fact]
    public void Validate_WhitespacePassword_ReturnsFalseWithAllErrors()
    {
        var (isValid, errors) = PasswordValidator.Validate("   ");

        Assert.False(isValid);
        Assert.Equal(5, errors.Count);
    }

    [Fact]
    public void Validate_TooShortPassword_ReturnsLengthError()
    {
        var (isValid, errors) = PasswordValidator.Validate("Ab1!");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("15 characters"));
    }

    [Fact]
    public void Validate_Exactly15CharsAllRulesMet_ReturnsTrue()
    {
        var (isValid, errors) = PasswordValidator.Validate("Abcdefghij1!@#$");

        Assert.True(isValid);
        Assert.Empty(errors);
    }

    [Fact]
    public void Validate_14CharsAllRulesMet_ReturnsFalse()
    {
        var (isValid, errors) = PasswordValidator.Validate("Abcdefghi1!@#$");

        Assert.False(isValid);
        Assert.Single(errors);
        Assert.Contains("15 characters", errors[0]);
    }

    [Fact]
    public void Validate_NoUppercase_ReturnsUppercaseError()
    {
        var (isValid, errors) = PasswordValidator.Validate("abcdefghijk1!@#");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("uppercase"));
    }

    [Fact]
    public void Validate_NoLowercase_ReturnsLowercaseError()
    {
        var (isValid, errors) = PasswordValidator.Validate("ABCDEFGHIJK1!@#");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("lowercase"));
    }

    [Fact]
    public void Validate_NoDigit_ReturnsDigitError()
    {
        var (isValid, errors) = PasswordValidator.Validate("Abcdefghijklm!@#");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("number"));
    }

    [Fact]
    public void Validate_NoSpecialChar_ReturnsSpecialCharError()
    {
        var (isValid, errors) = PasswordValidator.Validate("Abcdefghijklm1234");

        Assert.False(isValid);
        Assert.Contains(errors, e => e.Contains("special character"));
    }

    [Fact]
    public void Validate_MultipleRulesFail_ReturnsMultipleErrors()
    {
        var (isValid, errors) = PasswordValidator.Validate("abc");

        Assert.False(isValid);
        Assert.True(errors.Count >= 3);
    }

    [Fact]
    public void Validate_UnicodeCharacters_HandlesGracefully()
    {
        var (isValid, errors) = PasswordValidator.Validate("Abcdefghijk1!@#\u00e9");

        Assert.True(isValid);
    }
}