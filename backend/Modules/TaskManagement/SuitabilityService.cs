using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Neo4j.Driver;

namespace Backend.Modules.TaskManagement;

public class SuitabilityService : ISuitabilityService
{
    private readonly AppDbContext _db;
    private readonly IDriver _neo4j;
    private readonly ILogger<SuitabilityService> _logger;
    private readonly IExpertSystemConfigStore _configStore;

    public SuitabilityService(AppDbContext db, IOptions<Neo4jSettings> options, IExpertSystemConfigStore configStore, ILogger<SuitabilityService> logger)
    {
        _db = db;
        _neo4j = GraphDatabase.Driver(options.Value.Uri, AuthTokens.Basic(options.Value.User, options.Value.Password));
        _configStore = configStore;
        _logger = logger;
    }

    public async Task<ApiResponseDTO<List<SuitabilityResponseDTO>>> GetSuitableEmployeesAsync(
        Guid taskId, UserRole callerRole, Guid callerDepartmentId)
    {
        var task = await _db.Tasks
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            return ApiResponseDTO<List<SuitabilityResponseDTO>>.Failure("Task not found");

        var departmentId = task.AssignedDepartmentId?.ToString();
        if (string.IsNullOrEmpty(departmentId))
            return ApiResponseDTO<List<SuitabilityResponseDTO>>.Failure("Task has no assigned department");

        var classification = task.Classification.ToString();
        var priority = task.PriorityLevel.ToString();

        var eligibleRoleIds = callerRole switch
        {
            UserRole.Manager => new[] { "2", "3", "4" },
            UserRole.Coordinator => new[] { "2", "3", "4" },
            _ => Array.Empty<string>()
        };

        if (eligibleRoleIds.Length == 0)
            return ApiResponseDTO<List<SuitabilityResponseDTO>>.Failure("Not authorized to view suitability");

        try
        {
            var session = _neo4j.AsyncSession();
            try
            {
                var result = await session.ExecuteReadAsync(async tx =>
                {
                    var cfg = _configStore.GetConfig();
                    var cursor = await tx.RunAsync(@"
                        MATCH (d:Department {id: $departmentId})
                        MATCH (e:Employee)-[:BELONGS_TO]->(d)
                        WHERE e.availabilityStatus = '0'
                          AND e.role IN $eligibleRoleIds
                        WITH e,
                             1.0 - (e.workload * 1.0 / $maxWorkload) AS workloadFactor,
                             CASE WHEN $classification = 'RoutineDailyTask'
                                  THEN e.completedRoutineTasks * 1.0 / $maxXP
                                  ELSE e.completedSpecialTasks * 1.0 / $maxXP
                             END AS experienceFactor,
                             (e.avgTimelinessScore + e.avgWorkQualityScore + e.avgCommunicationScore) / 3.0
                             AS recScore
                        RETURN e.id AS employeeId,
                               e.employeeNumber AS employeeNumber,
                               e.firstName + ' ' + e.lastName AS fullName,
                               e.role AS role,
                               e.workload AS workload,
                               ($workloadWeight * workloadFactor + $experienceWeight * experienceFactor + $recScoreWeight * recScore)
                               AS suitabilityScore
                        ORDER BY suitabilityScore DESC
                        LIMIT 5
                    ", new
                    {
                        departmentId,
                        eligibleRoleIds,
                        classification,
                        maxWorkload = cfg.MaxWorkload,
                        maxXP = cfg.MaxXP,
                        workloadWeight = cfg.WorkloadWeight,
                        experienceWeight = cfg.ExperienceWeight,
                        recScoreWeight = cfg.RecScoreWeight
                    });

                    var employees = new List<SuitabilityResponseDTO>();
                    await foreach (var record in cursor)
                    {
                        employees.Add(new SuitabilityResponseDTO
                        {
                            EmployeeId = Guid.Parse(record["employeeId"].As<string>()),
                            EmployeeNumber = record["employeeNumber"].As<string>(),
                            FullName = record["fullName"].As<string>(),
                            Role = record["role"].As<string>(),
                            Workload = record["workload"].As<int>(),
                            SuitabilityScore = Math.Round(record["suitabilityScore"].As<double>(), 4)
                        });
                    }
                    return employees;
                });

                return ApiResponseDTO<List<SuitabilityResponseDTO>>.Success(result);
            }
            finally
            {
                await session.CloseAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Neo4j suitability query failed for task {TaskId}", taskId);
            return ApiResponseDTO<List<SuitabilityResponseDTO>>.Failure("Suitability engine unavailable");
        }
    }

    public async Task<ApiResponseDTO<List<SuitabilityExplanationDTO>>> GetSuitabilityExplanationAsync(
        Guid taskId, Guid employeeId, UserRole callerRole, Guid callerDepartmentId)
    {
        var task = await _db.Tasks
            .Include(t => t.AssignedDepartment)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task == null)
            return ApiResponseDTO<List<SuitabilityExplanationDTO>>.Failure("Task not found");

        var departmentId = task.AssignedDepartmentId?.ToString();
        if (string.IsNullOrEmpty(departmentId))
            return ApiResponseDTO<List<SuitabilityExplanationDTO>>.Failure("Task has no assigned department");

        var classification = task.Classification.ToString();

        var eligibleRoleIds = callerRole switch
        {
            UserRole.Manager => new[] { "2", "3", "4" },
            UserRole.Coordinator => new[] { "2", "3", "4" },
            _ => Array.Empty<string>()
        };

        if (eligibleRoleIds.Length == 0)
            return ApiResponseDTO<List<SuitabilityExplanationDTO>>.Failure("Not authorized to view suitability");

        try
        {
            var session = _neo4j.AsyncSession();
            try
            {
                var result = await session.ExecuteReadAsync(async tx =>
                {
                    var cfg = _configStore.GetConfig();
                    var employeeIdStr = employeeId.ToString();
                    var cursor = await tx.RunAsync(@"
                        MATCH (d:Department {id: $departmentId})
                        MATCH (e:Employee)-[:BELONGS_TO]->(d)
                        WHERE e.id = $employeeId
                          AND e.availabilityStatus = '0'
                          AND e.role IN $eligibleRoleIds
                        WITH e,
                             1.0 - (e.workload * 1.0 / $maxWorkload) AS workloadFactor,
                             CASE WHEN $classification = 'RoutineDailyTask'
                                  THEN e.completedRoutineTasks * 1.0 / $maxXP
                                  ELSE e.completedSpecialTasks * 1.0 / $maxXP
                             END AS experienceFactor,
                             (e.avgTimelinessScore + e.avgWorkQualityScore + e.avgCommunicationScore) / 3.0
                             AS recScore
                        RETURN e.id AS employeeId,
                               e.employeeNumber AS employeeNumber,
                               e.firstName + ' ' + e.lastName AS fullName,
                               e.workload AS workload,
                               e.completedRoutineTasks AS completedRoutineTasks,
                               e.completedSpecialTasks AS completedSpecialTasks,
                               workloadFactor,
                               experienceFactor,
                               recScore,
                               ($workloadWeight * workloadFactor + $experienceWeight * experienceFactor + $recScoreWeight * recScore)
                               AS suitabilityScore
                    ", new
                    {
                        departmentId,
                        eligibleRoleIds,
                        classification,
                        employeeId = employeeIdStr,
                        maxWorkload = cfg.MaxWorkload,
                        maxXP = cfg.MaxXP,
                        workloadWeight = cfg.WorkloadWeight,
                        experienceWeight = cfg.ExperienceWeight,
                        recScoreWeight = cfg.RecScoreWeight
                    });

                    var explanations = new List<SuitabilityExplanationDTO>();
                    await foreach (var record in cursor)
                    {
                        var workload = record["workload"].As<int>();
                        var experienceFactor = record["experienceFactor"].As<double>();
                        var workloadFactor = record["workloadFactor"].As<double>();
                        var recScore = record["recScore"].As<double>();
                        var finalScore = record["suitabilityScore"].As<double>();

                        var completedTasks = classification == "RoutineDailyTask"
                            ? record["completedRoutineTasks"].As<int>()
                            : record["completedSpecialTasks"].As<int>();

                        var workloadContribution = workloadFactor * cfg.WorkloadWeight;
                        var experienceContribution = experienceFactor * cfg.ExperienceWeight;
                        var recScoreContribution = recScore * cfg.RecScoreWeight;

                        var explanation =
                            $"{record["fullName"].As<string>()} scored {Math.Round(finalScore, 4)}. " +
                            $"They have {workload} active task(s) (workload factor {Math.Round(workloadFactor, 2)} × weight {cfg.WorkloadWeight} = {Math.Round(workloadContribution, 2)}), " +
                            $"{completedTasks} completed {(classification == "RoutineDailyTask" ? "routine" : "special")} tasks (experience factor {Math.Round(experienceFactor, 2)} × weight {cfg.ExperienceWeight} = {Math.Round(experienceContribution, 2)}), " +
                            $"and average recommendation score of {Math.Round(recScore, 2)} (rec score {Math.Round(recScore, 2)} × weight {cfg.RecScoreWeight} = {Math.Round(recScoreContribution, 2)}).";

                        explanations.Add(new SuitabilityExplanationDTO
                        {
                            EmployeeId = Guid.Parse(record["employeeId"].As<string>()),
                            EmployeeNumber = record["employeeNumber"].As<string>(),
                            FullName = record["fullName"].As<string>(),
                            FinalScore = Math.Round(finalScore, 4),
                            WorkloadFactor = Math.Round(workloadFactor, 4),
                            WorkloadWeight = cfg.WorkloadWeight,
                            ExperienceFactor = Math.Round(experienceFactor, 4),
                            ExperienceWeight = cfg.ExperienceWeight,
                            RecScore = Math.Round(recScore, 4),
                            RecScoreWeight = cfg.RecScoreWeight,
                            Explanation = explanation
                        });
                    }
                    return explanations;
                });

                if (result.Count == 0)
                    return ApiResponseDTO<List<SuitabilityExplanationDTO>>.Failure("Employee not found or not eligible for this task");

                return ApiResponseDTO<List<SuitabilityExplanationDTO>>.Success(result);
            }
            finally
            {
                await session.CloseAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Neo4j suitability explanation query failed for task {TaskId}, employee {EmployeeId}", taskId, employeeId);
            return ApiResponseDTO<List<SuitabilityExplanationDTO>>.Failure("Suitability engine unavailable");
        }
    }
}
