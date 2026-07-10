using Xunit;

namespace Backend.Tests;

public class TaskVisibilityFilterTests
{
    private bool CanUserSeeTask(int userRole, Guid? userDepartmentId, Guid? taskDepartmentId,
        bool isConfidential, bool isAssignedToUser)
    {
        switch (userRole)
        {
            case 0:
                return true;

            case 2:
                if (userDepartmentId.HasValue && taskDepartmentId.HasValue)
                    return userDepartmentId.Value == taskDepartmentId.Value;
                return false;

            case 1:
            case 3:
            case 4:
                if (isConfidential)
                    return false;
                return isAssignedToUser;

            default:
                return false;
        }
    }

    [Fact]
    public void Manager_SeesAllTasks()
    {
        Assert.True(CanUserSeeTask(0, null, Guid.NewGuid(), false, false));
        Assert.True(CanUserSeeTask(0, null, Guid.NewGuid(), true, false));
    }

    [Fact]
    public void Coordinator_SeesDepartmentTasksOnly()
    {
        var deptId = Guid.NewGuid();
        Assert.True(CanUserSeeTask(2, deptId, deptId, false, false));
        Assert.False(CanUserSeeTask(2, deptId, Guid.NewGuid(), false, false));
    }

    [Fact]
    public void Coordinator_SeesConfidentialTasks()
    {
        var deptId = Guid.NewGuid();
        Assert.True(CanUserSeeTask(2, deptId, deptId, true, false));
    }

    [Fact]
    public void Encoder_CannotSeeConfidentialTasks()
    {
        Assert.False(CanUserSeeTask(3, null, null, true, true));
    }

    [Fact]
    public void Encoder_SeesOnlyAssignedTasks()
    {
        Assert.True(CanUserSeeTask(3, null, null, false, true));
        Assert.False(CanUserSeeTask(3, null, null, false, false));
    }
}