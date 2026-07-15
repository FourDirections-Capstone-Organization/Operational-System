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

    public SuitabilityService(AppDbContext db, IOptions<Neo4jSettings> options, ILogger<SuitabilityService> logger)
    {
        _db = db;
        _neo4j = GraphDatabase.Driver(options.Value.Uri, AuthTokens.Basic(options.Value.User, options.Value.Password));
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
                               (0.35 * workloadFactor + 0.25 * experienceFactor + 0.40 * recScore)
                               AS suitabilityScore
                        ORDER BY suitabilityScore DESC
                        LIMIT 5
                    ", new
                    {
                        departmentId,
                        eligibleRoleIds,
                        classification,
                        maxWorkload = 10,
                        maxXP = 20
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
}
