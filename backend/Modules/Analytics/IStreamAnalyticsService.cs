using Backend.Models.DTOs;

namespace Backend.Modules.Analytics;

public interface IStreamAnalyticsService
{
    Task<DepartmentStreamMetricsDTO> GetDepartmentCompletionRateAsync(Guid departmentId);
    Task<List<OverdueAlertDTO>> GetOverdueAlertsAsync(Guid? departmentId = null);
    Task<WorkloadStreamDTO> GetLiveWorkloadAsync(Guid departmentId);
}
