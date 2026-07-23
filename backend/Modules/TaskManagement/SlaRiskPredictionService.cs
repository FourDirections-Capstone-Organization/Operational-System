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
    public float AssignedEmployeeCount { get; set; }
    public bool HasMultipleAssignments { get; set; }
}

internal class SlaRiskOutput
{
    public bool PredictedLabel { get; set; }
    public float Score { get; set; }
}

internal class SlaRiskTrainingData
{
    public float PriorityLevel { get; set; }
    public float Classification { get; set; }
    public float DepartmentWorkload { get; set; }
    public float AssignedEmployeeCount { get; set; }
    public bool HasMultipleAssignments { get; set; }
    public bool Label { get; set; }
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
    private string? _modelPath;
    private DateTime _lastModelLoadTime = DateTime.MinValue;

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
        _modelPath = Path.Combine(_env.ContentRootPath, "Models", "sla-risk-model.zip");
        LoadModel();
    }

    private void LoadModel()
    {
        if (string.IsNullOrEmpty(_modelPath) || !File.Exists(_modelPath))
        {
            _logger.LogInformation("No SLA risk model found at {Path}, using rule-based fallback", _modelPath);
            return;
        }

        try
        {
            lock (_modelLock)
            {
                var lastWrite = File.GetLastWriteTimeUtc(_modelPath);
                if (_model != null && lastWrite <= _lastModelLoadTime)
                    return;

                _model = _mlContext.Model.Load(_modelPath, out _);
                _predictionEngine = _mlContext.Model.CreatePredictionEngine<SlaRiskInput, SlaRiskOutput>(_model);
                _lastModelLoadTime = lastWrite;
                _logger.LogInformation("SLA risk model loaded from {Path}", _modelPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load SLA risk model from {Path}, falling back to rule-based", _modelPath);
            _model = null;
            _predictionEngine = null;
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

        EnsureModelLoaded();
        var (input, isUrgent, employeeWorkload, hoursUntilDeadline) = await BuildFeatureVectorAsync(task);

        if (_model != null && _predictionEngine != null)
        {
            return PredictWithModel(task, input);
        }

        return RuleBasedPrediction(task, input, isUrgent, employeeWorkload, hoursUntilDeadline);
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

        EnsureModelLoaded();
        var (input, isUrgent, employeeWorkload, hoursUntilDeadline) = await BuildFeatureVectorAsync(task);

        if (_model != null)
        {
            return ExplainWithModel(task, input);
        }

        return RuleBasedExplanation(task, input, isUrgent, employeeWorkload, hoursUntilDeadline);
    }

    internal void EnsureModelLoaded()
    {
        if (_model == null || File.Exists(_modelPath) && File.GetLastWriteTimeUtc(_modelPath) > _lastModelLoadTime)
            LoadModel();
    }

    private async Task<(SlaRiskInput Input, bool IsUrgent, int EmployeeWorkload, double HoursUntilDeadline)> BuildFeatureVectorAsync(Models.Task task)
    {
        var deptWorkload = task.AssignedDepartmentId.HasValue
            ? await _db.Tasks.CountAsync(t =>
                t.AssignedDepartmentId == task.AssignedDepartmentId.Value &&
                t.Status != Backend.Models.Enums.TaskStatus.Completed &&
                t.Status != Backend.Models.Enums.TaskStatus.Cancelled)
            : 0;

        var isUrgent = task.PriorityLevel == PriorityLevel.Urgent;
        var hoursUntilDeadline = (task.Deadline - DateTime.UtcNow).TotalHours;
        var assignedEmployeeCount = task.Assignments.Count;
        var hasMultipleAssignments = assignedEmployeeCount > 1;

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

        return (
            new SlaRiskInput
            {
                PriorityLevel = (float)task.PriorityLevel,
                Classification = (float)task.Classification,
                DepartmentWorkload = deptWorkload,
                AssignedEmployeeCount = assignedEmployeeCount,
                HasMultipleAssignments = hasMultipleAssignments
            },
            isUrgent,
            employeeWorkload,
            hoursUntilDeadline
        );
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

        var response = new SlaRiskResponseDTO
        {
            TaskId = task.Id,
            RiskLevel = riskLevel,
            ConfidenceScore = Math.Round(confidence, 4),
            KeyFactors = new List<string>
            {
                $"Priority: {task.PriorityLevel}",
                $"Department workload: {input.DepartmentWorkload} active tasks",
                $"Assigned employees: {input.AssignedEmployeeCount}"
            }
        };

        UpdateTaskRiskLevel(task, riskLevel);

        return response;
    }

    private SlaRiskResponseDTO RuleBasedPrediction(Models.Task task, SlaRiskInput input, bool isUrgent, int employeeWorkload, double hoursUntilDeadline)
    {
        var factors = new List<string>();
        string riskLevel;
        double confidence;

        if (isUrgent)
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
            factors.Add($"Non-urgent priority with {Math.Round(hoursUntilDeadline, 1)} hours until deadline");
        }

        if (employeeWorkload > 5)
            factors.Add($"Assignee has {employeeWorkload} active tasks");

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
            new() { FeatureName = "AssignedEmployeeCount", Value = input.AssignedEmployeeCount, Contribution = Math.Min(input.AssignedEmployeeCount / 5.0, 1.0), Description = $"{input.AssignedEmployeeCount} assigned employees" },
            new() { FeatureName = "HasMultipleAssignments", Value = input.HasMultipleAssignments ? 1 : 0, Contribution = input.HasMultipleAssignments ? 0.3 : 0.0, Description = input.HasMultipleAssignments ? "Multiple employees assigned" : "Single employee assigned" }
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

    private SlaRiskExplanationDTO RuleBasedExplanation(Models.Task task, SlaRiskInput input, bool isUrgent, int employeeWorkload, double hoursUntilDeadline)
    {
        var riskResponse = RuleBasedPrediction(task, input, isUrgent, employeeWorkload, hoursUntilDeadline);

        var contributions = new List<FactorContributionDTO>
        {
            new() { FeatureName = "PriorityLevel", Value = input.PriorityLevel, Contribution = isUrgent ? 0.6 : 0.2, Description = $"Priority level: {task.PriorityLevel}" },
            new() { FeatureName = "Classification", Value = input.Classification, Contribution = input.Classification * 0.1, Description = $"Classification: {task.Classification}" },
            new() { FeatureName = "DepartmentWorkload", Value = input.DepartmentWorkload, Contribution = Math.Min(input.DepartmentWorkload / 20.0, 1.0), Description = $"{input.DepartmentWorkload} active tasks in department" },
            new() { FeatureName = "AssignedEmployeeCount", Value = input.AssignedEmployeeCount, Contribution = Math.Min(input.AssignedEmployeeCount / 5.0, 1.0), Description = $"{input.AssignedEmployeeCount} assigned employees" },
            new() { FeatureName = "HasMultipleAssignments", Value = input.HasMultipleAssignments ? 1 : 0, Contribution = input.HasMultipleAssignments ? 0.3 : 0.0, Description = input.HasMultipleAssignments ? "Multiple employees assigned" : "Single employee assigned" },
            new() { FeatureName = "IsUrgent", Value = isUrgent ? 1 : 0, Contribution = isUrgent ? 0.8 : 0.0, Description = isUrgent ? "Urgent priority task" : "Non-urgent priority" },
            new() { FeatureName = "HourUntilDeadline", Value = (float)Math.Round(hoursUntilDeadline, 1), Contribution = Math.Min(1.0 - hoursUntilDeadline / 168.0, 1.0), Description = $"{Math.Round(hoursUntilDeadline, 1)} hours until deadline" }
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
}
