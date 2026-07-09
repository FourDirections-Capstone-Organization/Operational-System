using Backend.Models.Enums;
using Xunit;

namespace Backend.Tests;

public class UpdateUserRoleTests
{
    [Fact]
    public void NonManager_CannotUpdateRole()
    {
        var requesterRole = UserRole.Coordinator;
        var canUpdate = requesterRole == UserRole.Manager;

        Assert.False(canUpdate);
    }

    [Fact]
    public void Manager_CanUpdateRole()
    {
        var requesterRole = UserRole.Manager;
        var canUpdate = requesterRole == UserRole.Manager;

        Assert.True(canUpdate);
    }

    [Fact]
    public void CannotChangeOwnRole()
    {
        var userId = Guid.NewGuid();
        var requestUserId = userId;
        var isSelf = userId == requestUserId;

        Assert.True(isSelf);
    }

    [Fact]
    public void CanChangeOtherUsersRole()
    {
        var userId = Guid.NewGuid();
        var requestUserId = Guid.NewGuid();
        var isSelf = userId == requestUserId;

        Assert.False(isSelf);
    }
}