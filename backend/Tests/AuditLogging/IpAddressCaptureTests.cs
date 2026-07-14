using Xunit;

namespace Backend.Tests;

public class IpAddressCaptureTests
{
    private string? ExtractIpAddress(string? remoteIp, string? forwardedFor)
    {
        if (!string.IsNullOrEmpty(forwardedFor))
            return forwardedFor.Split(',').First().Trim();

        return remoteIp;
    }

    [Fact]
    public void DirectConnection_RemoteIpUsed()
    {
        var ip = ExtractIpAddress("192.168.1.100", null);
        Assert.Equal("192.168.1.100", ip);
    }

    [Fact]
    public void BehindProxy_ForwardedForUsed()
    {
        var ip = ExtractIpAddress("10.0.0.1", "203.0.113.50, 10.0.0.1");
        Assert.Equal("203.0.113.50", ip);
    }

    [Fact]
    public void NullIp_HandledGracefully()
    {
        var ip = ExtractIpAddress(null, null);
        Assert.Null(ip);
    }
}
