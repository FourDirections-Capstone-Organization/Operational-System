using Backend.Models.Enums;

namespace Backend.Tests.TaskManagement;

public class ManualDeployTests
{
    private (bool IsValid, string? ErrorMessage) ValidateDeploy(
        bool isActive, Guid? assigneeId, Dictionary<Guid, (bool IsActive, bool IsDeactivated)> users,
        AssignmentScope scope, Guid? departmentId, Dictionary<Guid, bool> departments)
    {
        if (!isActive)
            return (false, "Template is Inactive and cannot be deployed");

        if (assigneeId.HasValue)
        {
            if (!users.ContainsKey(assigneeId.Value) || !users[assigneeId.Value].IsActive || users[assigneeId.Value].IsDeactivated)
                return (false, "Designated assignee is unavailable for deployment");
        }

        if (scope == AssignmentScope.Department && departmentId.HasValue)
        {
            if (!departments.ContainsKey(departmentId.Value) || !departments[departmentId.Value])
                return (false, "Default department is inactive or does not exist");
        }

        return (true, null);
    }

    private List<Guid> ResolveAssigneeIds(
        Guid? defaultAssigneeId, Dictionary<Guid, (bool IsActive, bool IsDeactivated)> users,
        AssignmentScope scope, Guid? departmentId, Dictionary<Guid, Guid?> userDepartments)
    {
        var ids = new List<Guid>();

        if (defaultAssigneeId.HasValue && users.ContainsKey(defaultAssigneeId.Value)
            && users[defaultAssigneeId.Value].IsActive && !users[defaultAssigneeId.Value].IsDeactivated)
        {
            ids.Add(defaultAssigneeId.Value);
        }

        if (scope == AssignmentScope.Department && departmentId.HasValue)
        {
            var deptUsers = userDepartments
                .Where(u => u.Value == departmentId.Value
                    && users.ContainsKey(u.Key)
                    && users[u.Key].IsActive
                    && !users[u.Key].IsDeactivated)
                .Select(u => u.Key)
                .ToList();

            ids.AddRange(deptUsers);
        }

        return ids.Distinct().ToList();
    }

    [Fact]
    public void ActiveTemplate_CanDeploy()
    {
        var (isValid, _) = ValidateDeploy(true, null, new(), AssignmentScope.SingleEmployee, null, new());
        Assert.True(isValid);
    }

    [Fact]
    public void InactiveTemplate_CannotDeploy()
    {
        var (isValid, error) = ValidateDeploy(false, null, new(), AssignmentScope.SingleEmployee, null, new());
        Assert.False(isValid);
        Assert.Contains("Inactive", error);
    }

    [Fact]
    public void Deploy_WithoutAssignee_IsValid()
    {
        var (isValid, _) = ValidateDeploy(true, null, new(), AssignmentScope.SingleEmployee, null, new());
        Assert.True(isValid);
    }

    [Fact]
    public void Deploy_WithAvailableAssignee_IsValid()
    {
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool)> { { userId, (true, false) } };
        var (isValid, _) = ValidateDeploy(true, userId, users, AssignmentScope.SingleEmployee, null, new());
        Assert.True(isValid);
    }

    [Fact]
    public void Deploy_WithUnavailableAssignee_IsInvalid()
    {
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool)> { { userId, (false, true) } };
        var (isValid, error) = ValidateDeploy(true, userId, users, AssignmentScope.SingleEmployee, null, new());
        Assert.False(isValid);
        Assert.Contains("unavailable", error);
    }

    [Fact]
    public void Resolve_SingleEmployee_ReturnsAssignee()
    {
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool)> { { userId, (true, false) } };
        var result = ResolveAssigneeIds(userId, users, AssignmentScope.SingleEmployee, null, new());

        Assert.Single(result);
        Assert.Equal(userId, result[0]);
    }

    [Fact]
    public void Resolve_Department_ExpandsUsers()
    {
        var deptId = Guid.NewGuid();
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();
        var otherUser = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool)>
        {
            { user1, (true, false) },
            { user2, (true, false) },
            { otherUser, (true, false) }
        };
        var userDepts = new Dictionary<Guid, Guid?>
        {
            { user1, deptId },
            { user2, deptId },
            { otherUser, Guid.NewGuid() }
        };

        var result = ResolveAssigneeIds(null, users, AssignmentScope.Department, deptId, userDepts);

        Assert.Equal(2, result.Count);
        Assert.Contains(user1, result);
        Assert.Contains(user2, result);
        Assert.DoesNotContain(otherUser, result);
    }

    [Fact]
    public void Resolve_Department_WithAssignee_Deduplicates()
    {
        var deptId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool)> { { userId, (true, false) } };
        var userDepts = new Dictionary<Guid, Guid?> { { userId, deptId } };

        var result = ResolveAssigneeIds(userId, users, AssignmentScope.Department, deptId, userDepts);

        Assert.Single(result);
        Assert.Equal(userId, result[0]);
    }

    [Fact]
    public void Resolve_UnavailableAssignee_NotIncluded()
    {
        var userId = Guid.NewGuid();
        var users = new Dictionary<Guid, (bool, bool)> { { userId, (false, true) } };
        var result = ResolveAssigneeIds(userId, users, AssignmentScope.SingleEmployee, null, new());

        Assert.Empty(result);
    }

    [Fact]
    public void Resolve_NoAssigneeAndNoDepartment_ReturnsEmpty()
    {
        var result = ResolveAssigneeIds(null, new(), AssignmentScope.SingleEmployee, null, new());
        Assert.Empty(result);
    }
}
