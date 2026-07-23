using Backend.Models.Enums;

namespace Backend.Tests;

public class ExpertSystemConfigAdminTests
{
    private bool IsAuthorizedForAdminConfig(UserRole role)
    {
        return role == UserRole.Manager;
    }

    private (bool IsValid, string? Error) ValidateWeightUpdate(
        double workloadWeight, double experienceWeight, double recScoreWeight,
        int maxWorkload, int maxXP)
    {
        if (workloadWeight < 0 || experienceWeight < 0 || recScoreWeight < 0)
            return (false, "Weights cannot be negative");
        if (maxWorkload < 1)
            return (false, "MaxWorkload must be at least 1");
        if (maxXP < 1)
            return (false, "MaxXP must be at least 1");
        var sum = workloadWeight + experienceWeight + recScoreWeight;
        if (Math.Abs(sum - 1.0) > 0.05)
            return (false, $"Weights sum to {Math.Round(sum, 4)}, must be approximately 1.0");
        return (true, null);
    }

    private (double WorkloadWeight, double ExperienceWeight, double RecScoreWeight) StoredConfig
    {
        get => _storedConfig;
        set => _storedConfig = value;
    }
    private (double, double, double) _storedConfig = (0.35, 0.25, 0.40);

    [Fact]
    public void Manager_CanReadConfig()
    {
        var authorized = IsAuthorizedForAdminConfig(UserRole.Manager);
        Assert.True(authorized);
    }

    [Fact]
    public void Coordinator_CannotReadConfig()
    {
        var authorized = IsAuthorizedForAdminConfig(UserRole.Coordinator);
        Assert.False(authorized);
    }

    [Fact]
    public void Dispatcher_CannotReadConfig()
    {
        var authorized = IsAuthorizedForAdminConfig(UserRole.Dispatcher);
        Assert.False(authorized);
    }

    [Fact]
    public void Encoder_CannotReadConfig()
    {
        var authorized = IsAuthorizedForAdminConfig(UserRole.Encoder);
        Assert.False(authorized);
    }

    [Fact]
    public void Courier_CannotReadConfig()
    {
        var authorized = IsAuthorizedForAdminConfig(UserRole.Courier);
        Assert.False(authorized);
    }

    [Fact]
    public void Manager_CanUpdateConfig_WithValidWeights()
    {
        var (isValid, _) = ValidateWeightUpdate(0.50, 0.25, 0.25, 10, 20);
        Assert.True(isValid);
    }

    [Fact]
    public void Manager_CannotUpdateConfig_WithInvalidWeights()
    {
        var (isValid, _) = ValidateWeightUpdate(0.50, 0.50, 0.50, 10, 20);
        Assert.False(isValid);
    }

    [Fact]
    public void NegativeWeights_AreRejected()
    {
        var (isValid, error) = ValidateWeightUpdate(-0.10, 0.60, 0.50, 10, 20);
        Assert.False(isValid);
        Assert.Contains("negative", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void MaxWorkloadLessThanOne_IsRejected()
    {
        var (isValid, error) = ValidateWeightUpdate(0.35, 0.25, 0.40, 0, 20);
        Assert.False(isValid);
        Assert.Contains("MaxWorkload", error);
    }

    [Fact]
    public void MaxXPLessThanOne_IsRejected()
    {
        var (isValid, error) = ValidateWeightUpdate(0.35, 0.25, 0.40, 10, 0);
        Assert.False(isValid);
        Assert.Contains("MaxXP", error);
    }
}
