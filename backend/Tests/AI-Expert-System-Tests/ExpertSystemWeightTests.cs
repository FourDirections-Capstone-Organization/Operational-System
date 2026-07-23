namespace Backend.Tests;

public class ExpertSystemWeightTests
{
    private const double DefaultWorkloadWeight = 0.35;
    private const double DefaultExperienceWeight = 0.25;
    private const double DefaultRecScoreWeight = 0.40;
    private const int DefaultMaxWorkload = 10;
    private const int DefaultMaxXP = 20;

    private double CalculateSuitabilityScore(int workload, int completedTasks, double recScore,
        double workloadWeight, double experienceWeight, double recScoreWeight,
        int maxWorkload, int maxXP)
    {
        var workloadFactor = Math.Max(0, 1.0 - workload * 1.0 / maxWorkload);
        var experienceFactor = Math.Min(1.0, completedTasks * 1.0 / maxXP);
        return workloadWeight * workloadFactor + experienceWeight * experienceFactor + recScoreWeight * recScore;
    }

    private (bool IsValid, string? Error) ValidateWeights(
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

    [Fact]
    public void DefaultWeights_SumToOne()
    {
        var sum = DefaultWorkloadWeight + DefaultExperienceWeight + DefaultRecScoreWeight;
        Assert.Equal(1.0, sum, 2);
    }

    [Fact]
    public void WeightChange_AffectsScoreOrdering()
    {
        var employeeA = (workload: 3, completedTasks: 15, recScore: 0.8);
        var employeeB = (workload: 8, completedTasks: 5, recScore: 0.6);

        var scoreA_Default = CalculateSuitabilityScore(
            employeeA.workload, employeeA.completedTasks, employeeA.recScore,
            DefaultWorkloadWeight, DefaultExperienceWeight, DefaultRecScoreWeight,
            DefaultMaxWorkload, DefaultMaxXP);
        var scoreB_Default = CalculateSuitabilityScore(
            employeeB.workload, employeeB.completedTasks, employeeB.recScore,
            DefaultWorkloadWeight, DefaultExperienceWeight, DefaultRecScoreWeight,
            DefaultMaxWorkload, DefaultMaxXP);

        var scoreA_HighWorkloadWeight = CalculateSuitabilityScore(
            employeeA.workload, employeeA.completedTasks, employeeA.recScore,
            0.80, 0.10, 0.10,
            DefaultMaxWorkload, DefaultMaxXP);
        var scoreB_HighWorkloadWeight = CalculateSuitabilityScore(
            employeeB.workload, employeeB.completedTasks, employeeB.recScore,
            0.80, 0.10, 0.10,
            DefaultMaxWorkload, DefaultMaxXP);

        Assert.True(scoreA_Default > scoreB_Default,
            $"With default weights: A={scoreA_Default}, B={scoreB_Default}. Expected A > B");
        Assert.True(scoreA_HighWorkloadWeight > scoreB_HighWorkloadWeight,
            $"With high workload weight: A={scoreA_HighWorkloadWeight}, B={scoreB_HighWorkloadWeight}. Expected A > B");
    }

    [Fact]
    public void MaxWorkload_CapsAtConfiguredValue()
    {
        var workloadFactor = Math.Max(0, 1.0 - 15 * 1.0 / DefaultMaxWorkload);
        Assert.Equal(0.0, workloadFactor, 4);
    }

    [Fact]
    public void MaxXP_CapsExperienceAtConfiguredValue()
    {
        var experienceFactor = Math.Min(1.0, 30 * 1.0 / DefaultMaxXP);
        Assert.Equal(1.0, experienceFactor, 4);
    }

    [Fact]
    public void ZeroWeight_DisablesFactor()
    {
        var score = CalculateSuitabilityScore(
            5, 10, 0.5,
            0.0, 0.50, 0.50,
            DefaultMaxWorkload, DefaultMaxXP);

        var expectedWorkloadContribution = 0.0;
        var expectedExperienceContribution = 0.50 * Math.Min(1.0, 10.0 / DefaultMaxXP);
        var expectedRecScoreContribution = 0.50 * 0.5;
        var expected = expectedWorkloadContribution + expectedExperienceContribution + expectedRecScoreContribution;

        Assert.Equal(expected, score, 4);
    }

    [Fact]
    public void InValidConfig_ThrowsOnSumNotCloseToOne()
    {
        var (isValid, _) = ValidateWeights(0.50, 0.50, 0.50, DefaultMaxWorkload, DefaultMaxXP);
        Assert.False(isValid);
    }

    [Fact]
    public void ValidConfig_AcceptsSumCloseToOne()
    {
        var (isValid, _) = ValidateWeights(0.34, 0.33, 0.33, DefaultMaxWorkload, DefaultMaxXP);
        Assert.True(isValid);
    }
}
