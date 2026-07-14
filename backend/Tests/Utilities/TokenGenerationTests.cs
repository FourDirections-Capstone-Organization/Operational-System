using System.Security.Cryptography;

namespace Backend.Tests;

public class TokenGenerationTests
{
    private string GenerateToken()
    {
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToHexString(tokenBytes).ToLowerInvariant();
    }

    [Fact]
    public void Token_Is64CharsHex()
    {
        var token = GenerateToken();
        Assert.Equal(64, token.Length);
        Assert.Matches("^[0-9a-f]{64}$", token);
    }

    [Fact]
    public void Tokens_AreUnique()
    {
        var tokens = new HashSet<string>();
        for (int i = 0; i < 100; i++)
        {
            tokens.Add(GenerateToken());
        }
        Assert.Equal(100, tokens.Count);
    }

    [Fact]
    public void Token_IsLowercase()
    {
        var token = GenerateToken();
        Assert.Equal(token, token.ToLowerInvariant());
    }
}
