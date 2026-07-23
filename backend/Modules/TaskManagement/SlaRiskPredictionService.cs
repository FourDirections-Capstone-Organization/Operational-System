using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.ML;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

internal class SlaRiskInput
{
    public float PriorityLevel { get; set; }
    public float Classification { get; set; }
    public float DepartmentWorkload { get; set; }
    public float EmployeeWorkload { get; set; }
    public float TaskCountInDept { get; set; }
    public float HourUntilDeadline { get; set; }
    public bool IsUrgent { get; set; }
}

internal class SlaRiskOutput
{
    public bool PredictedLabel { get; set; }
    public float Score { get; set; }
}

public class SlaRiskPredictionService : ISlaRiskPredictionService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<SlaRiskPredictionService> _logger;
    private readonly MLContext _mlContext;
    private ITransformer? _model;
    private PredictionEngine<SlaRiskInput, SlaRiskOutput>? _predictionEngine;
    private readonly object _modelLock = new();

    private static readonly int HighDepartmentWorkloadThreshold = 10;

    public SlaRiskPredictionService(
        AppDbContext db,
        IWebHostEnvironment env,
        ILogger<SlaRiskPredictionService> logger)
    {
        _db = db;
        _env = env;
        _logger = logger;
        _mlContext = new MLContext(seed: 42);
        LoadModel();
    }

    private void LoadModel()
    {
        var modelPath = Path.Combine(_env.ContentRootPath, "Models", "sla-risk-model.zip");
        if (File.Exists(modelPath))
        {
            try
            {
                lock (_modelLock)
                {
                    _model = _mlContext.Model.Load(modelPath, out _);
                    _predictionEngine = _mlContext.Model.CreatePredictionEngine<SlaRiskInput, SlaRiskOutput>(_model);
                }
                _logger.LogInformation("SLA risk model loaded from {Path}", modelPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load SLA risk model from {Path}, falling back to rule-based", modelPath);
                _model = null;
                _predictionEngine = null;
            }
        }
        else
        {
            _logger.LogInformation("No SLA risk model found at {Path}, using rule-based fallback", modelPath);
        }
    }

    public async Task<SlaRiskResponseDTO> PredictRiskAsync(Guid taskId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            return new SlaRiskResponseDTO
            {
                TaskId = taskId,
                RiskLevel = "Low",
                ConfidenceScore = 0.0,
                KeyFactors = new List<string> { "Task not found" }
            };

        var input = await BuildFeatureVectorAsync(task);

        if (_model != null && _predictionEngine != null)
        {
            return PredictWithModel(task, input);
        }

        return RuleBasedPrediction(task, input);
    }

    public async Task<SlaRiskExplanationDTO> ExplainRiskAsync(Guid taskId)
    {
        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            return new SlaRiskExplanationDTO
            {
                TaskId = taskId,
                RiskLevel = "Low",
                ConfidenceScore = 0.0,
                FeatureContributions = new List<FactorContributionDTO>
                {
                    new() { FeatureName = "error", Value = 0, Contribution = 0, Description = "Task not found" }
                }
            };

        var input = await BuildFeatureVectorAsync(task);

        if (_model != null)
        {
            return ExplainWithModel(task, input);
        }

        return RuleBasedExplanation(task, input);
    }

    private async Task<SlaRiskInput> BuildFeatureVectorAsync(Models.Task task)
    {
        var deptWorkload = task.AssignedDepartmentId.HasValue
            ? await _db.Tasks.CountAsync(t =>
                t.AssignedDepartmentId == task.AssignedDepartmentId.Value &&
                t.Status != Backend.Models.Enums.TaskStatus.Completed &&
                t.Status != Backend.Models.Enums.TaskStatus.Cancelled)
            : 0;

        var employeeWorkload = 0;
        if (task.Assignments.Any())
        {
            var assignedUserIds = task.Assignments.Select(a => a.AssignedUserId).ToList();
            employeeWorkload = await _db.Tasks
                .CountAsync(t => t.Assignments.Any(a => assignedUserIds.Contains(a.AssignedUserId)) &&
                    t.Id != task.Id &&
                    t.Status != Backend.Models.Enums.TaskStatus.Completed &&
                    t.Status != Backend.Models.Enums.TaskStatus.Cancelled);
        }

        var hoursUntilDeadline = (task.Deadline - DateTime.UtcNow).TotalHours;

        return new SlaRiskInput
        {
            PriorityLevel = (float)task.PriorityLevel,
            Classification = (float)task.Classification,
            DepartmentWorkload = deptWorkload,
            EmployeeWorkload = employeeWorkload,
            TaskCountInDept = deptWorkload,
            HourUntilDeadline = (float)Math.Max(0, hoursUntilDeadline),
            IsUrgent = task.PriorityLevel == PriorityLevel.Urgent
        };
    }

    private SlaRiskResponseDTO PredictWithModel(Models.Task task, SlaRiskInput input)
    {
        SlaRiskOutput prediction;
        lock (_modelLock)
        {
            prediction = _predictionEngine!.Predict(input);
        }

        var riskLevel = DetermineRiskLevel(prediction.Score);
        var confidence = Math.Clamp(prediction.PredictedLabel ? prediction.Score : 1.0f - prediction.Score, 0.0, 1.0);

        var factors = BuildKeyFactors(input);

        var response = new SlaRiskResponseDTO
        {
            TaskId = task.Id,
            RiskLevel = riskLevel,
            ConfidenceScore = Math.Round(confidence, 4),
            KeyFactors = factors
        };

        UpdateTaskRiskLevel(task, riskLevel);

        return response;
    }

    private SlaRiskResponseDTO RuleBasedPrediction(Models.Task task, SlaRiskInput input)
    {
        var factors = new List<string>();
        string riskLevel;
        double confidence;

        if (input.IsUrgent)
        {
            if (input.DepartmentWorkload >= HighDepartmentWorkloadThreshold)
            {
                riskLevel = "Medium";
                confidence = 0.60;
                factors.Add($"Urgent priority with {input.DepartmentWorkload} active tasks in department");
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
            factors.Add($"Non-urgent priority with {Math.Round(input.HourUntilDeadline, 1)} hours until deadline");
        }

        if (input.EmployeeWorkload > 5)
            factors.Add($"Assignee has {input.EmployeeWorkload} active tasks");

        var response = new SlaRiskResponseDTO
        {
            TaskId = task.Id,
            RiskLevel = riskLevel,
            ConfidenceScore = confidence,
            KeyFactors = factors
        };

        UpdateTaskRiskLevel(task, riskLevel);

        return response;
    }

    private SlaRiskExplanationDTO ExplainWithModel(Models.Task task, SlaRiskInput input)
    {
        SlaRiskOutput prediction;
        lock (_modelLock)
        {
            prediction = _predictionEngine!.Predict(input);
        }

        var contributions = new List<FactorContributionDTO>
        {
            new() { FeatureName = "PriorityLevel", Value = input.PriorityLevel, Contribution = input.PriorityLevel / 3.0, Description = $"Priority level: {task.PriorityLevel}" },
            new() { FeatureName = "Classification", Value = input.Classification, Contribution = input.Classification, Description = $"Classification: {task.Classification}" },
            new() { FeatureName = "DepartmentWorkload", Value = input.DepartmentWorkload, Contribution = Math.Min(input.DepartmentWorkload / 20.0, 1.0), Description = $"{input.DepartmentWorkload} active tasks in department" },
            new() { FeatureName = "EmployeeWorkload", Value = input.EmployeeWorkload, Contribution = Math.Min(input.EmployeeWorkload / 10.0, 1.0), Description = $"{input.EmployeeWorkload} active tasks assigned to employee" },
            new() { FeatureName = "HourUntilDeadline", Value = (float)Math.Round(input.HourUntilDeadline, 1), Contribution = Math.Min(1.0 - input.HourUntilDeadline / 168.0, 1.0), Description = $"{Math.Round(input.HourUntilDeadline, 1)} hours until deadline" },
            new() { FeatureName = "IsUrgent", Value = input.IsUrgent ? 1 : 0, Contribution = input.IsUrgent ? 0.8 : 0.0, Description = input.IsUrgent ? "Urgent priority task" : "Non-urgent priority" }
        };

        var riskLevel = DetermineRiskLevel(prediction.Score);
        var confidence = Math.Clamp(prediction.PredictedLabel ? prediction.Score : 1.0f - prediction.Score, 0.0, 1.0);

        return new SlaRiskExplanationDTO
        {
            TaskId = task.Id,
            RiskLevel = riskLevel,
            ConfidenceScore = Math.Round(confidence, 4),
            FeatureContributions = contributions
        };
    }

    private SlaRiskExplanationDTO RuleBasedExplanation(Models.Task task, SlaRiskInput input)
    {
        var riskResponse = RuleBasedPrediction(task, input);

        var contributions = new List<FactorContributionDTO>
        {
            new() { FeatureName = "PriorityLevel", Value = input.PriorityLevel, Contribution = input.IsUrgent ? 0.6 : 0.2, Description = $"Priority level: {task.PriorityLevel}" },
            new() { FeatureName = "Classification", Value = input.Classification, Contribution = input.Classification * 0.1, Description = $"Classification: {task.Classification}" },
            new() { FeatureName = "DepartmentWorkload", Value = input.DepartmentWorkload, Contribution = Math.Min(input.DepartmentWorkload / 20.0, 1.0), Description = $"{input.DepartmentWorkload} active tasks in department" },
            new() { FeatureName = "EmployeeWorkload", Value = input.EmployeeWorkload, Contribution = Math.Min(input.EmployeeWorkload / 10.0, 1.0), Description = $"{input.EmployeeWorkload} active tasks assigned to employee" },
            new() { FeatureName = "HourUntilDeadline", Value = (float)Math.Round(input.HourUntilDeadline, 1), Contribution = Math.Min(1.0 - input.HourUntilDeadline / 168.0, 1.0), Description = $"{Math.Round(input.HourUntilDeadline, 1)} hours until deadline" },
            new() { FeatureName = "IsUrgent", Value = input.IsUrgent ? 1 : 0, Contribution = input.IsUrgent ? 0.8 : 0.0, Description = input.IsUrgent ? "Urgent priority task" : "Non-urgent priority" }
        };

        return new SlaRiskExplanationDTO
        {
            TaskId = task.Id,
            RiskLevel = riskResponse.RiskLevel,
            ConfidenceScore = riskResponse.ConfidenceScore,
            FeatureContributions = contributions
        };
    }

    private void UpdateTaskRiskLevel(Models.Task task, string riskLevel)
    {
        var level = riskLevel switch
        {
            "High" => SlaRiskLevel.High,
            "Medium" => SlaRiskLevel.Medium,
            _ => SlaRiskLevel.Low
        };

        if (task.SlaRiskLevel != level)
        {
            task.SlaRiskLevel = level;
            _db.SaveChanges();
        }
    }

    private static string DetermineRiskLevel(float score)
    {
        return score switch
        {
            >= 0.7f => "High",
            >= 0.4f => "Medium",
            _ => "Low"
        };
    }

    private static List<string> BuildKeyFactors(SlaRiskInput input)
    {
        var factors = new List<string>();
        if (input.IsUrgent)
            factors.Add("Urgent priority task");
        if (input.DepartmentWorkload > 10)
            factors.Add($"High department workload ({input.DepartmentWorkload} active tasks)");
        if (input.EmployeeWorkload > 5)
            factors.Add($"High employee workload ({input.EmployeeWorkload} active tasks)");
        if (input.HourUntilDeadline < 24)
            factors.Add($"Deadline within {Math.Round(input.HourUntilDeadline, 1)} hours");
        if (input.HourUntilDeadline > 168)
            factors.Add($"Sufficient time until deadline ({Math.Round(input.HourUntilDeadline, 1)} hours)");
        return factors;
    }
}
