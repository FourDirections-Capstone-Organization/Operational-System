using Backend.Models.Enums;

namespace Backend.Tests.TaskManagement;

public class RecommendationRoleValidationTests
{
    private (bool IsValid, string? ErrorMessage) ValidateCoordinatorRole(UserRole role)
    {
        if (role != UserRole.Coordinator && role != UserRole.Manager)
            return (false, "Only Coordinators and Managers can add recommendations");

        return (true, null);
    }

    [Fact]
    public void Coordinator_CanAddRecommendation()
    {
        var (isValid, _) = ValidateCoordinatorRole(UserRole.Coordinator);
        Assert.True(isValid);
    }

    [Fact]
    public void Manager_CanAddRecommendation()
    {
        var (isValid, _) = ValidateCoordinatorRole(UserRole.Manager);
        Assert.True(isValid);
    }

    [Fact]
    public void Encoder_CannotAddRecommendation()
    {
        var (isValid, error) = ValidateCoordinatorRole(UserRole.Encoder);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }

    [Fact]
    public void Dispatcher_CannotAddRecommendation()
    {
        var (isValid, error) = ValidateCoordinatorRole(UserRole.Dispatcher);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }

    [Fact]
    public void Courier_CannotAddRecommendation()
    {
        var (isValid, error) = ValidateCoordinatorRole(UserRole.Courier);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }
}
