using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;

namespace Backend.Modules.TaskManagement;

public class RecommendationService : IRecommendationService
{
    private readonly AppDbContext _db;

    public RecommendationService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<RecommendationResponseDTO>> CreateAsync(
        Guid taskId, CreateRecommendationDTO dto, Guid coordinatorId)
    {
        var coordinator = await _db.Users.FindAsync(coordinatorId);
        if (coordinator is null)
            return ApiResponseDTO<RecommendationResponseDTO>.Failure("User not found");

        if (coordinator.Role != UserRole.Coordinator && coordinator.Role != UserRole.Manager)
            return ApiResponseDTO<RecommendationResponseDTO>.Failure(
                "Only Coordinators and Managers can add recommendations");

        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is null)
            return ApiResponseDTO<RecommendationResponseDTO>.Failure("Task not found");

        if (string.IsNullOrWhiteSpace(dto.Notes))
            return ApiResponseDTO<RecommendationResponseDTO>.Failure("Recommendation notes are required");

        var assigneeId = task.Assignments.FirstOrDefault()?.AssignedUserId;
        if (!assigneeId.HasValue)
            return ApiResponseDTO<RecommendationResponseDTO>.Failure(
                "Task has no assigned user to recommend");

        var recommendation = new Recommendation
        {
            TaskId = taskId,
            AssigneeId = assigneeId.Value,
            CoordinatorId = coordinatorId,
            Category = dto.Category,
            Notes = dto.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _db.Recommendations.Add(recommendation);
        await _db.SaveChangesAsync();

        return ApiResponseDTO<RecommendationResponseDTO>.Success(
            await MapToResponseDTOAsync(recommendation),
            "Recommendation saved successfully");
    }

    public async Task<ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>> GetByTaskIdAsync(Guid taskId, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
            return ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>.Failure("Task not found");

        var query = _db.Recommendations
            .Include(r => r.Task)
            .Include(r => r.Assignee)
            .Include(r => r.Coordinator)
            .Where(r => r.TaskId == taskId);

        var totalCount = await query.CountAsync();

        var recommendations = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var response = new List<RecommendationResponseDTO>();
        foreach (var rec in recommendations)
        {
            response.Add(await MapToResponseDTOAsync(rec));
        }

        var paginatedResult = new PaginatedResponseDTO<RecommendationResponseDTO>
        {
            Items = response,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        return ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>.Success(paginatedResult);
    }

    public async Task<ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>> GetByAssigneeIdAsync(
        Guid assigneeId, int pageNumber = 1, int pageSize = 10, DateTime? dateFrom = null, DateTime? dateTo = null)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _db.Recommendations
            .Include(r => r.Task)
            .Include(r => r.Assignee)
            .Include(r => r.Coordinator)
            .Where(r => r.AssigneeId == assigneeId)
            .AsQueryable();

        if (dateFrom.HasValue)
            query = query.Where(r => r.CreatedAt >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(r => r.CreatedAt <= dateTo.Value);

        var totalCount = await query.CountAsync();

        var recommendations = await query
            .OrderBy(r => r.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var response = new List<RecommendationResponseDTO>();
        foreach (var rec in recommendations)
        {
            response.Add(await MapToResponseDTOAsync(rec));
        }

        var paginatedResult = new PaginatedResponseDTO<RecommendationResponseDTO>
        {
            Items = response,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        return ApiResponseDTO<PaginatedResponseDTO<RecommendationResponseDTO>>.Success(paginatedResult);
    }

    private async Task<RecommendationResponseDTO> MapToResponseDTOAsync(Recommendation rec)
    {
        return new RecommendationResponseDTO
        {
            Id = rec.Id,
            TaskId = rec.TaskId,
            TaskTitle = rec.Task?.Title,
            AssigneeId = rec.AssigneeId,
            AssigneeName = rec.Assignee is not null
                ? $"{rec.Assignee.FirstName} {rec.Assignee.LastName}".Trim()
                : null,
            CoordinatorId = rec.CoordinatorId,
            CoordinatorName = rec.Coordinator is not null
                ? $"{rec.Coordinator.FirstName} {rec.Coordinator.LastName}".Trim()
                : null,
            Category = rec.Category,
            Notes = rec.Notes,
            CreatedAt = rec.CreatedAt
        };
    }
}
