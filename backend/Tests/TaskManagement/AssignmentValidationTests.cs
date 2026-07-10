using Xunit;

namespace Backend.Tests;

public class AssignmentValidationTests
{
    private (bool IsValid, string? ErrorMessage) ValidateAssignment(
        int scope, List<Guid>? userIds, Guid? departmentId,
        Dictionary<Guid, (bool IsActive, bool IsDeactivated, int Role)> users,
        Dictionary<Guid, bool> departments)
    {
        switch (scope)
        {
            case 0:
                if (userIds is null || userIds.Count == 0)
                    return (false, "At least one assigned user is required for SingleEmployee scope");
                if (userIds.Count != 1)
                    return (false, "Exactly one user must be assigned for SingleEmployee scope");
                if (!users.ContainsKey(userIds[0]) || !users[userIds[0]].IsActive || users[userIds[0]].IsDeactivated)
                    return (false, "Selected user is inactive or does not exist");
                var allowedRoles = new[] { 1, 3, 4 };
                if (!allowedRoles.Contains(users[userIds[0]].Role))
                    return (false, "Assigned user must be an active Dispatcher, Encoder, or Courier");
                return (true, null);

            case 1:
                if (userIds is null || userIds.Count == 0)
                    return (false, "At least one team member is required for Team scope");
                foreach (var userId in userIds)
                {
                    if (!users.ContainsKey(userId) || !users[userId].IsActive || users[userId].IsDeactivated)
                        return (false, $"User {userId} is inactive or does not exist");
                }
                return (true, null);

            case 2:
                if (!departmentId.HasValue)
                    return (false, "Department is required for Department scope");
                if (!departments.ContainsKey(departmentId.Value) || !departments[departmentId.Value])
                    return (false, "Selected department is inactive or does not exist");
                return (true, null);

            default:
                return (false, "Invalid assignment scope");
        }
    }

    [Fact]
    public void SingleEmployee_NoUsers_ReturnsFalse()
    {
        var (isValid, error) = ValidateAssignment(0, null, null, new(), new());
        Assert.False(isValid);
        Assert.Contains("At least one assigned user", error);
    }

    [Fact]
    public void SingleEmployee_MultipleUsers_ReturnsFalse()
    {
        var users = new Dictionary<Guid, (bool, bool, int)>
        {
            { Guid.NewGuid(), (true, false, 1) },
            { Guid.NewGuid(), (true, false, 3) }
        };
        var (isValid, error) = ValidateAssignment(0, users.Keys.ToList(), null, users, new());
        Assert.False(isValid);
        Assert.Contains("Exactly one user", error);
    }

    [Fact]
    public void SingleEmployee_InactiveUser_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool, int)>
        {
            { userId, (false, true, 1) }
        };
        var (isValid, error) = ValidateAssignment(0, new List<Guid> { userId }, null, users, new());
        Assert.False(isValid);
        Assert.Contains("inactive or does not exist", error);
    }

    [Fact]
    public void SingleEmployee_NonAssignableRole_ReturnsFalse()
    {
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool, int)>
        {
            { userId, (true, false, 0) }
        };
        var (isValid, error) = ValidateAssignment(0, new List<Guid> { userId }, null, users, new());
        Assert.False(isValid);
        Assert.Contains("Dispatcher, Encoder, or Courier", error);
    }

    [Fact]
    public void Team_NoUsers_ReturnsFalse()
    {
        var (isValid, error) = ValidateAssignment(1, null, null, new(), new());
        Assert.False(isValid);
        Assert.Contains("At least one team member", error);
    }

    [Fact]
    public void Department_NoDepartmentId_ReturnsFalse()
    {
        var (isValid, error) = ValidateAssignment(2, null, null, new(), new());
        Assert.False(isValid);
        Assert.Contains("Department is required", error);
    }
}