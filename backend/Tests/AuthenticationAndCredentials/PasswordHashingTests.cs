using Microsoft.AspNetCore.Identity;
using Backend.Models;
using Xunit;

namespace Backend.Tests;

public class PasswordHashingTests
{
    [Fact]
    public void HashPassword_ProducesNonEmptyString()
    {
        var user = new User();
        var hasher = new PasswordHasher<User>();

        var hash = hasher.HashPassword(user, "MyStr0ng!Pass#2024");

        Assert.False(string.IsNullOrEmpty(hash));
    }

    [Fact]
    public void VerifyHashedPassword_CorrectPassword_ReturnsSuccess()
    {
        var user = new User();
        var hasher = new PasswordHasher<User>();
        var password = "MyStr0ng!Pass#2024";
        var hash = hasher.HashPassword(user, password);

        var result = hasher.VerifyHashedPassword(user, hash, password);

        Assert.Equal(PasswordVerificationResult.Success, result);
    }

    [Fact]
    public void VerifyHashedPassword_WrongPassword_ReturnsFailed()
    {
        var user = new User();
        var hasher = new PasswordHasher<User>();
        var hash = hasher.HashPassword(user, "MyStr0ng!Pass#2024");

        var result = hasher.VerifyHashedPassword(user, hash, "WrongPassword123!");

        Assert.Equal(PasswordVerificationResult.Failed, result);
    }
}