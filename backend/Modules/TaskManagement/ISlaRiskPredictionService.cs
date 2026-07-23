using Backend.Models.DTOs;

namespace Backend.Modules.TaskManagement;

public interface ISlaRiskPredictionService
{
    Task<SlaRiskResponseDTO> PredictRiskAsync(Guid taskId);
    Task<SlaRiskExplanationDTO> ExplainRiskAsync(Guid taskId);
}
