using System.Text.RegularExpressions;
using Xunit;

namespace Backend.Tests.UserAccountManagement;

public class TempPasswordGenerationTests
{
    private string GenerateTempPassword()
    {
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        const string special = "!@#$%^&*";

        var random = new Random();
        var password = new char[16];

        password[0] = upper[random.Next(upper.Length)];
        password[1] = lower[random.Next(lower.Length)];
        password[2] = digits[random.Next(digits.Length)];
        password[3] = special[random.Next(special.Length)];

        const string allChars = upper + lower + digits + special;
        for (int i = 4; i < 16; i++)
        {
            password[i] = allChars[random.Next(allChars.Length)];
        }

        var shuffled = password.OrderBy(_ => random.Next()).ToArray();
        return new string(shuffled);
    }

    [Fact]
    public void GenerateTempPassword_IsOWASPCompliant()
    {
        for (int i = 0; i < 100; i++)
        {
            var password = GenerateTempPassword();
            var (isValid, errors) = Backend.Modules.Utilities.PasswordValidator.Validate(password);
            Assert.True(isValid, $"Password '{password}' failed: {string.Join(", ", errors)}");
        }
    }

    [Fact]
    public void GenerateTempPassword_Is16Characters()
    {
        for (int i = 0; i < 100; i++)
        {
            var password = GenerateTempPassword();
            Assert.Equal(16, password.Length);
        }
    }

    [Fact]
    public void GenerateTempPassword_IsUniqueAcross1000Iterations()
    {
        var passwords = new HashSet<string>();
        for (int i = 0; i < 1000; i++)
        {
            passwords.Add(GenerateTempPassword());
        }

        Assert.Equal(1000, passwords.Count);
    }

    [Fact]
    public void GenerateTempPassword_ContainsAllRequiredTypes()
    {
        for (int i = 0; i < 100; i++)
        {
            var password = GenerateTempPassword();
            Assert.Matches(@"[A-Z]", password);
            Assert.Matches(@"[a-z]", password);
            Assert.Matches(@"[0-9]", password);
            Assert.Matches(@"[!@#$%^&*]", password);
        }
    }
}