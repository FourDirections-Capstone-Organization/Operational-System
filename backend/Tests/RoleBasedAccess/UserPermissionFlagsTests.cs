using Backend.Models.Enums;
using Xunit;

namespace Backend.Tests;

public class UserPermissionFlagsTests
{
    private (bool CanViewAllTasks, bool CanManageUsers, bool CanViewConfidentialTasks, bool CanAccessAuditLogs) GetFlags(UserRole role)
    {
        return (
            CanViewAllTasks: role == UserRole.Manager,
            CanManageUsers: role == UserRole.Manager,
            CanViewConfidentialTasks: role == UserRole.Manager || role == UserRole.Coordinator,
            CanAccessAuditLogs: role == UserRole.Manager
        );
    }

    [Fact]
    public void Manager_AllFlagsTrue()
    {
        var flags = GetFlags(UserRole.Manager);

        Assert.True(flags.CanViewAllTasks);
        Assert.True(flags.CanManageUsers);
        Assert.True(flags.CanViewConfidentialTasks);
        Assert.True(flags.CanAccessAuditLogs);
    }

    [Fact]
    public void Coordinator_OnlyConfidentialTrue()
    {
        var flags = GetFlags(UserRole.Coordinator);

        Assert.False(flags.CanViewAllTasks);
        Assert.False(flags.CanManageUsers);
        Assert.True(flags.CanViewConfidentialTasks);
        Assert.False(flags.CanAccessAuditLogs);
    }

    [Fact]
    public void Encoder_AllFlagsFalse()
    {
        var flags = GetFlags(UserRole.Encoder);

        Assert.False(flags.CanViewAllTasks);
        Assert.False(flags.CanManageUsers);
        Assert.False(flags.CanViewConfidentialTasks);
        Assert.False(flags.CanAccessAuditLogs);
    }

    [Fact]
    public void Dispatcher_AllFlagsFalse()
    {
        var flags = GetFlags(UserRole.Dispatcher);

        Assert.False(flags.CanViewAllTasks);
        Assert.False(flags.CanManageUsers);
        Assert.False(flags.CanViewConfidentialTasks);
        Assert.False(flags.CanAccessAuditLogs);
    }

    [Fact]
    public void Courier_AllFlagsFalse()
    {
        var flags = GetFlags(UserRole.Courier);

        Assert.False(flags.CanViewAllTasks);
        Assert.False(flags.CanManageUsers);
        Assert.False(flags.CanViewConfidentialTasks);
        Assert.False(flags.CanAccessAuditLogs);
    }
}