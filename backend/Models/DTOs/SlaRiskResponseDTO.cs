namespace Backend.Models.DTOs;

public class SlaRiskResponseDTO
{
    public Guid TaskId { get; set; }
    public string RiskLevel { get; set; } = "Low";
    public double ConfidenceScore { get; set; }
    public List<string> KeyFactors { get; set; } = new();
}

public class SlaRiskExplanationDTO
{
    public Guid TaskId { get; set; }
    public string RiskLevel { get; set; } = "Low";
    public double ConfidenceScore { get; set; }
    public List<FactorContributionDTO> FeatureContributions { get; set; } = new();
}

public class FactorContributionDTO
{
    public string FeatureName { get; set; } = string.Empty;
    public double Value { get; set; }
    public double Contribution { get; set; }
    public string Description { get; set; } = string.Empty;
}
