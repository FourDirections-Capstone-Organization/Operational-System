using System.Security.Cryptography;
using Xunit;

namespace Backend.Tests;

public class GenerateSecureTokenTests
{
    private string GenerateSecureToken()
    {
        var tokenBytes = new byte[32];
        RandomNumberGenerator.Fill(tokenBytes);
        return Convert.ToBase64String(tokenBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    [Fact]
    public void GenerateSecureToken_IsUrlSafe()
    {
        for (int i = 0; i < 100; i++)
        {
            var token = GenerateSecureToken();
            Assert.DoesNotContain("+", token);
            Assert.DoesNotContain("/", token);
            Assert.DoesNotContain("=", token);
        }
    }

    [Fact]
    public void GenerateSecureToken_IsAtLeast32Characters()
    {
        var token = GenerateSecureToken();
        Assert.True(token.Length >= 32);
    }

    [Fact]
    public void GenerateSecureToken_TwoConsecutiveTokens_AreDifferent()
    {
        var token1 = GenerateSecureToken();
        var token2 = GenerateSecureToken();
        Assert.NotEqual(token1, token2);
    }

    [Fact]
    public void GenerateSecureToken_1000Iterations_NoDuplicates()
    {
        var tokens = new HashSet<string>();
        for (int i = 0; i < 1000; i++)
        {
            tokens.Add(GenerateSecureToken());
        }

        Assert.Equal(1000, tokens.Count);
    }
}