using Xunit;

namespace Backend.Tests;

public class AssignmentResolutionTests
{
    private List<Guid> ResolveAssignedUserIds(
        int scope, List<Guid>? userIds, Guid? departmentId,
        Dictionary<Guid, (Guid? DepartmentId, bool IsActive, bool IsDeactivated)> users)
    {
        switch (scope)
        {
            case 0:
            case 1:
                return userIds ?? new List<Guid>();

            case 2:
                if (!departmentId.HasValue)
                    return new List<Guid>();

                return users
                    .Where(u => u.Value.DepartmentId == departmentId.Value
                        && u.Value.IsActive
                        && !u.Value.IsDeactivated)
                    .Select(u => u.Key)
                    .ToList();

            default:
                return new List<Guid>();
        }
    }

    [Fact]
    public void SingleEmployee_ReturnsSpecifiedUser()
    {
        var userId = Guid.NewGuid();
        var result = ResolveAssignedUserIds(0, new List<Guid> { userId }, null, new());
        Assert.Single(result);
        Assert.Equal(userId, result[0]);
    }

    [Fact]
    public void Team_ReturnsAllSpecifiedUsers()
    {
        var userIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        var result = ResolveAssignedUserIds(1, userIds, null, new());
        Assert.Equal(3, result.Count);
    }

    [Fact]
    public void Department_ExpandsToAllActiveUsers()
    {
        var deptId = Guid.NewGuid();
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var user3 = Guid.NewGuid();
        var users = new Dictionary<Guid, (Guid?, bool, bool)>
        {
            { user1, (deptId, true, false) },
            { user2, (deptId, true, false) },
            { user3, (Guid.NewGuid(), true, false) }
        };

        var result = ResolveAssignedUserIds(2, null, deptId, users);
        Assert.Equal(2, result.Count);
        Assert.Contains(user1, result);
        Assert.Contains(user2, result);
        Assert.DoesNotContain(user3, result);
    }

    [Fact]
    public void Department_ExcludesDeactivatedUsers()
    {
        var deptId = Guid.NewGuid();
        var activeUser = Guid.NewGuid();
        var deactivatedUser = Guid.NewGuid();
        var users = new Dictionary<Guid, (Guid?, bool, bool)>
        {
            { activeUser, (deptId, true, false) },
            { deactivatedUser, (deptId, true, true) }
        };

        var result = ResolveAssignedUserIds(2, null, deptId, users);
        Assert.Single(result);
        Assert.Contains(activeUser, result);
        Assert.DoesNotContain(deactivatedUser, result);
    }
}