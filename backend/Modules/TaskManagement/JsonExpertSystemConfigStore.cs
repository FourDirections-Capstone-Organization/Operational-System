using System.Text.Json;
using Microsoft.Extensions.Options;
using Backend.Models;

namespace Backend.Modules.TaskManagement;

public class JsonExpertSystemConfigStore : IExpertSystemConfigStore
{
    private readonly string _filePath;
    private readonly ExpertSystemConfig _defaultConfig;
    private readonly object _fileLock = new();
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public JsonExpertSystemConfigStore(IWebHostEnvironment env, IOptions<ExpertSystemConfig> defaultConfig)
    {
        _filePath = Path.Combine(env.ContentRootPath, "config-expert-system-override.json");
        _defaultConfig = defaultConfig.Value;
    }

    public ExpertSystemConfig GetConfig()
    {
        lock (_fileLock)
        {
            if (File.Exists(_filePath))
            {
                try
                {
                    var json = File.ReadAllText(_filePath);
                    return JsonSerializer.Deserialize<ExpertSystemConfig>(json) ?? new ExpertSystemConfig();
                }
                catch
                {
                    return new ExpertSystemConfig();
                }
            }
        }
        return new ExpertSystemConfig
        {
            WorkloadWeight = _defaultConfig.WorkloadWeight,
            ExperienceWeight = _defaultConfig.ExperienceWeight,
            RecScoreWeight = _defaultConfig.RecScoreWeight,
            MaxWorkload = _defaultConfig.MaxWorkload,
            MaxXP = _defaultConfig.MaxXP
        };
    }

    public void UpdateConfig(ExpertSystemConfig config)
    {
        lock (_fileLock)
        {
            var json = JsonSerializer.Serialize(config, JsonOptions);
            File.WriteAllText(_filePath, json);
        }
    }
}
