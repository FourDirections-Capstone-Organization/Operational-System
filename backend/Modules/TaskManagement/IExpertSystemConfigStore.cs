using Backend.Models;

namespace Backend.Modules.TaskManagement;

public interface IExpertSystemConfigStore
{
    ExpertSystemConfig GetConfig();
    void UpdateConfig(ExpertSystemConfig config);
}
