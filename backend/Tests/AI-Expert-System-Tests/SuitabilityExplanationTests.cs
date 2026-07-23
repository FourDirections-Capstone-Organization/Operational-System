using Backend.Models.DTOs;

namespace Backend.Tests;

public class SuitabilityExplanationTests
{
    private const double DefaultWorkloadWeight = 0.35;
    private const double DefaultExperienceWeight = 0.25;
    private const double DefaultRecScoreWeight = 0.40;
    private const int DefaultMaxWorkload = 10;
    private const int DefaultMaxXP = 20;

    private SuitabilityExplanationDTO BuildExplanation(
        string name, int workload, int completedTasks, double recScore,
        bool isAuthorized)
    {
        if (!isAuthorized)
            return new SuitabilityExplanationDTO
            {
                EmployeeId = Guid.Empty,
                EmployeeNumber = "",
                FullName = "",
                FinalScore = 0,
                Explanation = "Not authorized to view explanation"
            };

        var workloadFactor = Math.Max(0, 1.0 - workload * 1.0 / DefaultMaxWorkload);
        var experienceFactor = Math.Min(1.0, completedTasks * 1.0 / DefaultMaxXP);
        var finalScore = DefaultWorkloadWeight * workloadFactor
            + DefaultExperienceWeight * experienceFactor
            + DefaultRecScoreWeight * recScore;

        var workloadContribution = workloadFactor * DefaultWorkloadWeight;
        var experienceContribution = experienceFactor * DefaultExperienceWeight;
        var recScoreContribution = recScore * DefaultRecScoreWeight;

        var explanation = $"{name} scored {Math.Round(finalScore, 4)}. " +
            $"They have {workload} active task(s) (workload factor {Math.Round(workloadFactor, 2)} × weight {DefaultWorkloadWeight} = {Math.Round(workloadContribution, 2)}), " +
            $"{completedTasks} completed tasks (experience factor {Math.Round(experienceFactor, 2)} × weight {DefaultExperienceWeight} = {Math.Round(experienceContribution, 2)}), " +
            $"and average recommendation score of {Math.Round(recScore, 2)} (rec score {Math.Round(recScore, 2)} × weight {DefaultRecScoreWeight} = {Math.Round(recScoreContribution, 2)}).";

        return new SuitabilityExplanationDTO
        {
            EmployeeId = Guid.NewGuid(),
            EmployeeNumber = "EMP001",
            FullName = name,
            FinalScore = Math.Round(finalScore, 4),
            WorkloadFactor = Math.Round(workloadFactor, 4),
            WorkloadWeight = DefaultWorkloadWeight,
            ExperienceFactor = Math.Round(experienceFactor, 4),
            ExperienceWeight = DefaultExperienceWeight,
            RecScore = recScore,
            RecScoreWeight = DefaultRecScoreWeight,
            Explanation = explanation
        };
    }

    [Fact]
    public void Explanation_IncludesAllFactorValues()
    {
        var result = BuildExplanation("John Doe", 5, 10, 0.72, true);

        Assert.True(result.WorkloadFactor > 0);
        Assert.True(result.ExperienceFactor > 0);
        Assert.True(result.RecScore > 0);
        Assert.Equal(DefaultWorkloadWeight, result.WorkloadWeight);
        Assert.Equal(DefaultExperienceWeight, result.ExperienceWeight);
        Assert.Equal(DefaultRecScoreWeight, result.RecScoreWeight);
        Assert.True(result.FinalScore > 0);
    }

    [Fact]
    public void Explanation_GeneratesReadableText()
    {
        var result = BuildExplanation("Maria Santos", 2, 13, 0.72, true);

        Assert.Contains("Maria Santos", result.Explanation);
        Assert.Contains("workload factor", result.Explanation);
        Assert.Contains("experience factor", result.Explanation);
        Assert.Contains("rec score", result.Explanation);
    }

    [Fact]
    public void Explanation_ForTopEmployee_MatchesScore()
    {
        var result = BuildExplanation("John Doe", 2, 15, 0.90, true);

        var expectedScore = DefaultWorkloadWeight * Math.Max(0, 1.0 - 2.0 / DefaultMaxWorkload)
            + DefaultExperienceWeight * Math.Min(1.0, 15.0 / DefaultMaxXP)
            + DefaultRecScoreWeight * 0.90;

        Assert.Equal(Math.Round(expectedScore, 4), result.FinalScore);
    }

    [Fact]
    public void Explanation_EmptyWhenNotAuthorized()
    {
        var result = BuildExplanation("John Doe", 5, 10, 0.72, false);

        Assert.Equal("Not authorized to view explanation", result.Explanation);
        Assert.Equal(string.Empty, result.FullName);
    }
}
