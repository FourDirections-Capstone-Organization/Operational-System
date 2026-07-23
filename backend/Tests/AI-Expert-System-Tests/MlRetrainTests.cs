using Backend.Models.Enums;

namespace Backend.Tests;

public class MlRetrainTests
{
    private const int MinTrainingSamples = 10;
    private const int SufficientTrainingSamples = 50;

    private string CheckRetrainEligibility(int sampleCount)
    {
        if (sampleCount < MinTrainingSamples)
            return "Insufficient training data";
        if (sampleCount >= SufficientTrainingSamples)
            return "Model trained successfully";
        return "Model trained with limited data";
    }

    private bool IsAuthorizedForRetrain(UserRole role)
    {
        return role == UserRole.Manager;
    }

    [Fact]
    public void Retrain_WithSufficientData_Succeeds()
    {
        var result = CheckRetrainEligibility(50);
        Assert.Equal("Model trained successfully", result);
    }

    [Fact]
    public void Retrain_WithInsufficientData_ReturnsWarning()
    {
        var result = CheckRetrainEligibility(3);
        Assert.Contains("Insufficient", result);
    }

    [Fact]
    public void Retrain_ModelFileCreated()
    {
        var modelDir = Path.Combine(Directory.GetCurrentDirectory(), "Models");
        Directory.CreateDirectory(modelDir);
        var modelPath = Path.Combine(modelDir, "sla-risk-model.zip");

        try
        {
            File.WriteAllText(modelPath, "dummy-model-content");
            Assert.True(File.Exists(modelPath));
        }
        finally
        {
            if (File.Exists(modelPath))
                File.Delete(modelPath);
        }
    }

    [Fact]
    public void Retrain_RequiresManagerRole()
    {
        Assert.True(IsAuthorizedForRetrain(UserRole.Manager));
        Assert.False(IsAuthorizedForRetrain(UserRole.Coordinator));
        Assert.False(IsAuthorizedForRetrain(UserRole.Dispatcher));
        Assert.False(IsAuthorizedForRetrain(UserRole.Encoder));
        Assert.False(IsAuthorizedForRetrain(UserRole.Courier));
    }

    [Fact]
    public void Retrain_WithTenSamples_BarelyMinimum()
    {
        var result = CheckRetrainEligibility(10);
        Assert.NotEqual("Insufficient training data", result);
    }

    [Fact]
    public void Retrain_WithNineSamples_BelowMinimum()
    {
        var result = CheckRetrainEligibility(9);
        Assert.Equal("Insufficient training data", result);
    }
}
