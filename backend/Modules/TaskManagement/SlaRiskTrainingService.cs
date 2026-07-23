using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Microsoft.ML.Trainers.FastTree;
using Backend.Data;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public interface IRetrainTrigger
{
    void RequestRetrain();
}

public class SlaRiskTrainingService : BackgroundService, IRetrainTrigger
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<SlaRiskTrainingService> _logger;
    private readonly SemaphoreSlim _retrainSemaphore = new(0, 1);
    private static readonly TimeSpan RetrainInterval = TimeSpan.FromHours(24);
    private const int MinTrainingSamples = 10;

    public SlaRiskTrainingService(
        IServiceScopeFactory scopeFactory,
        IWebHostEnvironment env,
        ILogger<SlaRiskTrainingService> logger)
    {
        _scopeFactory = scopeFactory;
        _env = env;
        _logger = logger;
    }

    public void RequestRetrain()
    {
        try { _retrainSemaphore.Release(); }
        catch (SemaphoreFullException) { }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SLA risk training service starting");

        await TrainModelAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _retrainSemaphore.WaitAsync(RetrainInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            await TrainModelAsync(stoppingToken);
        }
    }

    public async Task TrainModelAsync(CancellationToken stoppingToken = default)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var trainingData = await BuildTrainingDataAsync(db, stoppingToken);

            if (trainingData.Count < MinTrainingSamples)
            {
                _logger.LogWarning(
                    "Insufficient training data: {Count} samples (minimum {Min}). Model not updated.",
                    trainingData.Count, MinTrainingSamples);
                return;
            }

            _logger.LogInformation("Training SLA risk model with {Count} samples", trainingData.Count);

            var mlContext = new MLContext(seed: 42);
            var dataView = mlContext.Data.LoadFromEnumerable(trainingData);

            var pipeline = mlContext.Transforms.Concatenate("Features",
                    nameof(SlaRiskTrainingData.PriorityLevel),
                    nameof(SlaRiskTrainingData.Classification),
                    nameof(SlaRiskTrainingData.DepartmentWorkload),
                    nameof(SlaRiskTrainingData.AssignedEmployeeCount),
                    nameof(SlaRiskTrainingData.HasMultipleAssignments))
                .Append(mlContext.BinaryClassification.Trainers.FastTree(
                    labelColumnName: "Label",
                    featureColumnName: "Features",
                    numberOfLeaves: 20,
                    numberOfTrees: 100,
                    minimumExampleCountPerLeaf: 10));

            var model = pipeline.Fit(dataView);

            var modelDir = Path.Combine(_env.ContentRootPath, "Models");
            Directory.CreateDirectory(modelDir);
            var modelPath = Path.Combine(modelDir, "sla-risk-model.zip");

            mlContext.Model.Save(model, dataView.Schema, modelPath);

            _logger.LogInformation("SLA risk model saved to {Path} ({Count} samples)", modelPath, trainingData.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to train SLA risk model");
        }
    }

    private async Task<List<SlaRiskTrainingData>> BuildTrainingDataAsync(
        AppDbContext db, CancellationToken stoppingToken)
    {
        var completedTasks = await db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.AssignedDepartment)
            .Where(t => t.Status == Backend.Models.Enums.TaskStatus.Completed ||
                        t.Status == Backend.Models.Enums.TaskStatus.Cancelled)
            .ToListAsync(stoppingToken);

        var data = new List<SlaRiskTrainingData>(completedTasks.Count);

        foreach (var task in completedTasks)
        {
            var deptWorkload = task.AssignedDepartmentId.HasValue
                ? await db.Tasks.CountAsync(dt =>
                    dt.AssignedDepartmentId == task.AssignedDepartmentId.Value &&
                    dt.CreatedAt <= task.CreatedAt &&
                    dt.Id != task.Id, stoppingToken)
                : 0;

            var assignedEmployeeCount = task.Assignments.Count;
            var hasMultipleAssignments = assignedEmployeeCount > 1;

            var isOverdue = task.Status == Backend.Models.Enums.TaskStatus.Cancelled
                ? false
                : task.IsApproved == false || task.Deadline < task.CreatedAt.AddHours(24);

            data.Add(new SlaRiskTrainingData
            {
                PriorityLevel = (float)task.PriorityLevel,
                Classification = (float)task.Classification,
                DepartmentWorkload = deptWorkload,
                AssignedEmployeeCount = assignedEmployeeCount,
                HasMultipleAssignments = hasMultipleAssignments ? 1f : 0f,
                Label = isOverdue
            });
        }

        return data;
    }
}
