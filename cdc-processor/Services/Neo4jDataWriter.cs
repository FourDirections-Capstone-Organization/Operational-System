using System.Text.Json;
using CdcProcessor.Models;
using Microsoft.Extensions.Options;
using Neo4j.Driver;

namespace CdcProcessor.Services;

public class Neo4jDataWriter : IAsyncDisposable
{
    private readonly Neo4jOptions _options;
    private readonly ILogger<Neo4jDataWriter> _logger;
    private readonly IDriver _driver;

    public Neo4jDataWriter(IOptions<Neo4jOptions> options, ILogger<Neo4jDataWriter> logger)
    {
        _options = options.Value;
        _logger = logger;
        _driver = GraphDatabase.Driver(_options.Uri, AuthTokens.Basic(_options.User, _options.Password));
    }

    public async Task ProcessAndWriteAsync(List<CdcPayload> events)
    {
        var session = _driver.AsyncSession();
        try
        {
            var derived = CalculateDerivedInsights(events);

            foreach (var dept in derived.Departments)
            {
                await session.ExecuteWriteAsync(async tx =>
                {
                    await tx.RunAsync(
                        "MERGE (d:Department {id: $id}) SET d.name = $name",
                        new { id = dept.Id, name = dept.Name });
                });
            }

            foreach (var emp in derived.Employees)
            {
                await session.ExecuteWriteAsync(async tx =>
                {
                    await tx.RunAsync(@"
                        MERGE (e:Employee {id: $id})
                        SET e.employeeNumber = $employeeNumber,
                            e.firstName = $firstName,
                            e.lastName = $lastName,
                            e.role = $role,
                            e.availabilityStatus = $availabilityStatus,
                            e.workload = $workload,
                            e.completedRoutineTasks = $completedRoutineTasks,
                            e.completedSpecialTasks = $completedSpecialTasks,
                            e.avgTimelinessScore = $avgTimelinessScore,
                            e.avgWorkQualityScore = $avgWorkQualityScore,
                            e.avgCommunicationScore = $avgCommunicationScore",
                        new
                        {
                            id = emp.Id,
                            employeeNumber = emp.EmployeeNumber,
                            firstName = emp.FirstName,
                            lastName = emp.LastName,
                            role = emp.Role,
                            availabilityStatus = emp.AvailabilityStatus,
                            workload = emp.Workload,
                            completedRoutineTasks = emp.CompletedRoutineTasks,
                            completedSpecialTasks = emp.CompletedSpecialTasks,
                            avgTimelinessScore = emp.AvgTimelinessScore,
                            avgWorkQualityScore = emp.AvgWorkQualityScore,
                            avgCommunicationScore = emp.AvgCommunicationScore
                        });
                });

                if (!string.IsNullOrEmpty(emp.DepartmentId))
                {
                    await session.ExecuteWriteAsync(async tx =>
                    {
                        await tx.RunAsync(
                            "MATCH (e:Employee {id: $empId}), (d:Department {id: $deptId}) " +
                            "MERGE (e)-[:BELONGS_TO]->(d)",
                            new { empId = emp.Id, deptId = emp.DepartmentId });
                    });
                }
            }

            foreach (var task in derived.Tasks)
            {
                await session.ExecuteWriteAsync(async tx =>
                {
                    await tx.RunAsync(@"
                        MERGE (t:Task {id: $id})
                        SET t.title = $title,
                            t.status = $status,
                            t.priority = $priority,
                            t.classification = $classification,
                            t.deadline = $deadline,
                            t.createdAt = $createdAt",
                        new
                        {
                            id = task.Id,
                            title = task.Title,
                            status = task.Status,
                            priority = task.Priority,
                            classification = task.Classification,
                            deadline = task.Deadline ?? "",
                            createdAt = task.CreatedAt ?? ""
                        });
                });

                if (task.AssignedDepartmentId != null)
                {
                    await session.ExecuteWriteAsync(async tx =>
                    {
                        await tx.RunAsync(
                            "MATCH (t:Task {id: $taskId}), (d:Department {id: $deptId}) " +
                            "MERGE (t)-[:ASSIGNED_TO_DEPT]->(d)",
                            new { taskId = task.Id, deptId = task.AssignedDepartmentId });
                    });
                }
            }

            foreach (var assignment in derived.Assignments)
            {
                await session.ExecuteWriteAsync(async tx =>
                {
                    await tx.RunAsync(
                        "MATCH (e:Employee {id: $empId}), (t:Task {id: $taskId}) " +
                        "MERGE (e)-[:ASSIGNED_TO {assignedAt: $assignedAt}]->(t)",
                        new
                        {
                            empId = assignment.AssignedUserId,
                            taskId = assignment.TaskId,
                            assignedAt = assignment.AssignedAt ?? ""
                        });
                });
            }

            _logger.LogInformation(
                "Wrote to Neo4j: {DeptCount} departments, {EmpCount} employees, {TaskCount} tasks, {AssignCount} assignments",
                derived.Departments.Count, derived.Employees.Count, derived.Tasks.Count, derived.Assignments.Count);
        }
        finally
        {
            await session.CloseAsync();
        }
    }

    private DerivedData CalculateDerivedInsights(List<CdcPayload> events)
    {
        var result = new DerivedData();

        var latestUsers = new Dictionary<string, Dictionary<string, object?>>();
        var latestTasks = new Dictionary<string, Dictionary<string, object?>>();
        var allAssignments = new List<Dictionary<string, object?>>();
        var allRecommendations = new List<Dictionary<string, object?>>();
        var latestDepartments = new Dictionary<string, Dictionary<string, object?>>();

        foreach (var evt in events)
        {
            var table = evt.Source?.Table ?? "";
            var data = evt.After ?? evt.Before;
            if (data == null) continue;

            var tableName = ExtractTableName(table);

            switch (tableName)
            {
                case "Users":
                    var userId = GetString(data, "Id");
                    if (userId != null && evt.Op != "d")
                        latestUsers[userId] = data;
                    break;
                case "Tasks":
                    var taskId = GetString(data, "Id");
                    if (taskId != null && evt.Op != "d")
                        latestTasks[taskId] = data;
                    break;
                case "TaskAssignments":
                    if (data.ContainsKey("TaskId") && data.ContainsKey("AssignedUserId"))
                        allAssignments.Add(data);
                    break;
                case "Recommendations":
                    if (data.ContainsKey("AssigneeId"))
                        allRecommendations.Add(data);
                    break;
                case "Departments":
                    var deptId = GetString(data, "Id");
                    if (deptId != null && evt.Op != "d")
                        latestDepartments[deptId] = data;
                    break;
            }
        }

        foreach (var dept in latestDepartments.Values)
        {
            result.Departments.Add(new DepartmentData
            {
                Id = GetString(dept, "Id") ?? "",
                Name = GetString(dept, "Name") ?? ""
            });
        }

        var taskStatusInProgress = new HashSet<string> { "0", "1", "2" };
        var taskStatusCompleted = new HashSet<string> { "3" };

        var employeeTaskCounts = new Dictionary<string, (int active, int routineCompleted, int specialCompleted)>();

        foreach (var (tId, task) in latestTasks)
        {
            var status = GetString(task, "Status") ?? "";
            var classification = GetString(task, "Classification") ?? "";
            var deptId = GetString(task, "AssignedDepartmentId");

            result.Tasks.Add(new TaskData
            {
                Id = tId,
                Title = GetString(task, "Title") ?? "",
                Status = status,
                Priority = GetString(task, "PriorityLevel") ?? "",
                Classification = classification,
                Deadline = GetString(task, "Deadline"),
                CreatedAt = GetString(task, "CreatedAt"),
                AssignedDepartmentId = deptId
            });
        }

        foreach (var assignment in allAssignments)
        {
            var taskId = GetString(assignment, "TaskId");
            var userId = GetString(assignment, "AssignedUserId");
            if (taskId == null || userId == null) continue;

            if (!employeeTaskCounts.ContainsKey(userId))
                employeeTaskCounts[userId] = (0, 0, 0);

            var counts = employeeTaskCounts[userId];
            var status = "";
            var classification = "";

            if (latestTasks.TryGetValue(taskId, out var taskData))
            {
                status = GetString(taskData, "Status") ?? "";
                classification = GetString(taskData, "Classification") ?? "";
            }

            if (taskStatusInProgress.Contains(status))
                counts.active++;
            else if (taskStatusCompleted.Contains(status))
            {
                if (classification == "RoutineDailyTask")
                    counts.routineCompleted++;
                else
                    counts.specialCompleted++;
            }

            employeeTaskCounts[userId] = counts;

            result.Assignments.Add(new AssignmentData
            {
                TaskId = taskId,
                AssignedUserId = userId,
                AssignedAt = GetString(assignment, "AssignedAt")
            });
        }

        var recCounts = new Dictionary<string, (int total, int timeliness, int quality, int communication)>();

        foreach (var rec in allRecommendations)
        {
            var assigneeId = GetString(rec, "AssigneeId");
            if (assigneeId == null) continue;

            if (!recCounts.ContainsKey(assigneeId))
                recCounts[assigneeId] = (0, 0, 0, 0);

            var counts = recCounts[assigneeId];
            counts.total++;

            var category = GetString(rec, "Category") ?? "";
            switch (category)
            {
                case "Timeliness": counts.timeliness++; break;
                case "WorkQuality": counts.quality++; break;
                case "Communication": counts.communication++; break;
            }

            recCounts[assigneeId] = counts;
        }

        foreach (var (uId, user) in latestUsers)
        {
            var empRecs = recCounts.GetValueOrDefault(uId);
            var taskCounts = employeeTaskCounts.GetValueOrDefault(uId);

            result.Employees.Add(new EmployeeData
            {
                Id = uId,
                EmployeeNumber = GetString(user, "EmployeeNumber") ?? "",
                FirstName = GetString(user, "FirstName") ?? "",
                LastName = GetString(user, "LastName") ?? "",
                Role = GetString(user, "Role") ?? "",
                AvailabilityStatus = GetString(user, "AvailabilityStatus") ?? "Active",
                DepartmentId = GetString(user, "DepartmentId") ?? "",
                Workload = taskCounts.active,
                CompletedRoutineTasks = taskCounts.routineCompleted,
                CompletedSpecialTasks = taskCounts.specialCompleted,
                AvgTimelinessScore = empRecs.total > 0 ? (double)empRecs.timeliness / empRecs.total : 0.0,
                AvgWorkQualityScore = empRecs.total > 0 ? (double)empRecs.quality / empRecs.total : 0.0,
                AvgCommunicationScore = empRecs.total > 0 ? (double)empRecs.communication / empRecs.total : 0.0,
            });
        }

        return result;
    }

    private static string ExtractTableName(string topic)
    {
        var parts = topic.Split('.');
        return parts.Length >= 3 ? parts[2] : topic;
    }

    private static string? GetString(Dictionary<string, object?> data, string key)
    {
        if (data.TryGetValue(key, out var value) && value != null)
        {
            if (value is JsonElement je && je.ValueKind == JsonValueKind.String)
                return je.GetString();
            return value.ToString();
        }
        return null;
    }

    public async ValueTask DisposeAsync()
    {
        await _driver.DisposeAsync();
    }

    private class DerivedData
    {
        public List<DepartmentData> Departments { get; set; } = new();
        public List<EmployeeData> Employees { get; set; } = new();
        public List<TaskData> Tasks { get; set; } = new();
        public List<AssignmentData> Assignments { get; set; } = new();
    }

    private class DepartmentData { public string Id { get; set; } = ""; public string Name { get; set; } = ""; }
    private class EmployeeData
    {
        public string Id { get; set; } = "";
        public string EmployeeNumber { get; set; } = "";
        public string FirstName { get; set; } = "";
        public string LastName { get; set; } = "";
        public string Role { get; set; } = "";
        public string AvailabilityStatus { get; set; } = "Active";
        public string DepartmentId { get; set; } = "";
        public int Workload { get; set; }
        public int CompletedRoutineTasks { get; set; }
        public int CompletedSpecialTasks { get; set; }
        public double AvgTimelinessScore { get; set; }
        public double AvgWorkQualityScore { get; set; }
        public double AvgCommunicationScore { get; set; }
    }
    private class TaskData
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Status { get; set; } = "";
        public string Priority { get; set; } = "";
        public string Classification { get; set; } = "";
        public string? Deadline { get; set; }
        public string? CreatedAt { get; set; }
        public string? AssignedDepartmentId { get; set; }
    }
    private class AssignmentData
    {
        public string TaskId { get; set; } = "";
        public string AssignedUserId { get; set; } = "";
        public string? AssignedAt { get; set; }
    }
}
