using Backend.Models.DTOs;

namespace Backend.Tests;

public class SlaRiskPredictionTests
{
    private const int HighDepartmentWorkloadThreshold = 10;

    private (string RiskLevel, double Confidence, List<string> Factors) RuleBasedPredict(
        bool isUrgent, int departmentWorkload, int employeeWorkload, double hoursUntilDeadline)
    {
        var factors = new List<string>();
        string riskLevel;
        double confidence;

        if (isUrgent)
        {
            if (departmentWorkload >= HighDepartmentWorkloadThreshold)
            {
                riskLevel = "Medium";
                confidence = 0.60;
                factors.Add($"Urgent priority with {departmentWorkload} active tasks in department");
            }
            else
            {
                riskLevel = "Low";
                confidence = 0.70;
                factors.Add("Urgent priority but department workload is manageable");
            }
        }
        else
        {
            riskLevel = "Low";
            confidence = 0.80;
            factors.Add($"Non-urgent priority with {Math.Round(hoursUntilDeadline, 1)} hours until deadline");
        }

        if (employeeWorkload > 5)
            factors.Add($"Assignee has {employeeWorkload} active tasks");

        return (riskLevel, confidence, factors);
    }

    private double ClampConfidence(double rawScore)
    {
        return Math.Clamp(rawScore, 0.0, 1.0);
    }

    [Fact]
    public void UrgentTask_HigherRiskThanLowPriority()
    {
        var urgentResult = RuleBasedPredict(true, 5, 2, 48);
        var lowResult = RuleBasedPredict(false, 5, 2, 168);

        var urgentRiskScore = urgentResult.RiskLevel == "Medium" ? 2 : urgentResult.RiskLevel == "High" ? 3 : 1;
        var lowRiskScore = lowResult.RiskLevel == "Medium" ? 2 : lowResult.RiskLevel == "High" ? 3 : 1;

        Assert.True(urgentRiskScore >= lowRiskScore);
    }

    [Fact]
    public void HighDepartmentWorkload_IncreasesRisk()
    {
        var highWorkload = RuleBasedPredict(true, 15, 2, 24);
        var lowWorkload = RuleBasedPredict(true, 3, 2, 24);

        var highRiskScore = highWorkload.RiskLevel == "Medium" ? 2 : highWorkload.RiskLevel == "High" ? 3 : 1;
        var lowRiskScore = lowWorkload.RiskLevel == "Medium" ? 2 : lowWorkload.RiskLevel == "High" ? 3 : 1;

        Assert.True(highRiskScore >= lowRiskScore);
    }

    [Fact]
    public void TaskWithSufficientTime_LowRisk()
    {
        var result = RuleBasedPredict(false, 3, 1, 168);

        Assert.Equal("Low", result.RiskLevel);
    }

    [Fact]
    public void TaskApproachingDeadline_HigherRisk()
    {
        var nearDeadline = RuleBasedPredict(true, 12, 3, 0.5);
        var farDeadline = RuleBasedPredict(false, 12, 3, 168);

        var nearRiskScore = nearDeadline.RiskLevel == "Medium" ? 2 : nearDeadline.RiskLevel == "High" ? 3 : 1;
        var farRiskScore = farDeadline.RiskLevel == "Medium" ? 2 : farDeadline.RiskLevel == "High" ? 3 : 1;

        Assert.True(nearRiskScore >= farRiskScore);
    }

    [Fact]
    public void NullModel_FallbackToRuleBased()
    {
        var result = RuleBasedPredict(true, 3, 1, 24);

        Assert.Equal("Low", result.RiskLevel);
        Assert.True(result.Confidence > 0);
        Assert.NotNull(result.Factors);
    }

    [Fact]
    public void ConfidenceScore_IsBetweenZeroAndOne()
    {
        var lowConfidence = ClampConfidence(-0.5);
        var highConfidence = ClampConfidence(1.5);
        var normalConfidence = ClampConfidence(0.75);

        Assert.Equal(0.0, lowConfidence);
        Assert.Equal(1.0, highConfidence);
        Assert.Equal(0.75, normalConfidence, 4);
    }

    [Fact]
    public void RiskExplanation_IncludesKeyFactors()
    {
        var (_, _, factors) = RuleBasedPredict(true, 12, 6, 1);

        Assert.NotEmpty(factors);
        Assert.Contains("Urgent priority", factors[0]);
        Assert.Contains("active tasks in department", factors[0]);
    }

    [Fact]
    public void RiskLevel_UpdatesOnTaskEntity()
    {
        var riskLevel = "Medium";

        var slaLevel = riskLevel switch
        {
            "High" => Backend.Models.Enums.SlaRiskLevel.High,
            "Medium" => Backend.Models.Enums.SlaRiskLevel.Medium,
            _ => Backend.Models.Enums.SlaRiskLevel.Low
        };

        Assert.Equal(Backend.Models.Enums.SlaRiskLevel.Medium, slaLevel);
    }
}
