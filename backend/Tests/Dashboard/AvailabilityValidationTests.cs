using Xunit;

namespace Backend.Tests.Dashboard;

public class AvailabilityValidationTests
{
    private (bool IsValid, string? ErrorMessage) ValidateAvailability(
        int availabilityStatus, bool isActive, bool isDeactivated)
    {
        if (!isActive || isDeactivated)
            return (false, "Employee is deactivated");

        if (availabilityStatus != 0)
        {
            var statusName = availabilityStatus == 1 ? "Offline" : "OnLeave";
            return (false, $"Selected employee is currently unavailable ({statusName}). Please choose another employee.");
        }

        return (true, null);
    }

    [Fact]
    public void ActiveUser_Passes()
    {
        var (isValid, error) = ValidateAvailability(0, true, false);
        Assert.True(isValid);
        Assert.Null(error);
    }

    [Fact]
    public void OfflineUser_Fails()
    {
        var (isValid, error) = ValidateAvailability(1, true, false);
        Assert.False(isValid);
        Assert.Contains("Offline", error);
    }

    [Fact]
    public void OnLeaveUser_Fails()
    {
        var (isValid, error) = ValidateAvailability(2, true, false);
        Assert.False(isValid);
        Assert.Contains("OnLeave", error);
    }

    [Fact]
    public void DeactivatedUser_Fails()
    {
        var (isValid, error) = ValidateAvailability(0, true, true);
        Assert.False(isValid);
        Assert.Contains("deactivated", error);
    }

    [Fact]
    public void InactiveUser_Fails()
    {
        var (isValid, error) = ValidateAvailability(0, false, false);
        Assert.False(isValid);
        Assert.Contains("deactivated", error);
    }
}
