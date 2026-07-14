using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Modules.Notifications;
using Microsoft.Extensions.Options;

namespace Backend.Modules.TaskManagement;

public class TaskCommentService : ITaskCommentService
{
    private readonly AppDbContext _db;
    private readonly FileStorageSettings _fileSettings;
    private readonly ILogger<TaskCommentService> _logger;
    private readonly INotificationService _notificationService;

    public TaskCommentService(
        AppDbContext db,
        IOptions<FileStorageSettings> fileSettings,
        ILogger<TaskCommentService> logger,
        INotificationService notificationService)
    {
        _db = db;
        _fileSettings = fileSettings.Value;
        _logger = logger;
        _notificationService = notificationService;
    }

    public async Task<ApiResponseDTO<TaskCommentResponseDTO>> CreateAsync(
        Guid taskId, string content, IFormFile? file, Guid authorId)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("Task not found");

        var author = await _db.Users.FindAsync(authorId);
        if (author is null)
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("User not found");

        if (string.IsNullOrWhiteSpace(content))
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("Comment content is required");

        var comment = new TaskComment
        {
            TaskId = taskId,
            AuthorId = authorId,
            Content = content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        if (file is not null && file.Length > 0)
        {
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (!_fileSettings.AllowedFileTypes.Contains(extension))
                return ApiResponseDTO<TaskCommentResponseDTO>.Failure(
                    $"Unsupported file format. Allowed: {string.Join(", ", _fileSettings.AllowedFileTypes)}");

            if (file.Length > _fileSettings.MaxFileSizeBytes)
                return ApiResponseDTO<TaskCommentResponseDTO>.Failure(
                    $"File exceeds the maximum allowed size ({_fileSettings.MaxFileSizeBytes / 1024 / 1024}MB)");

            var uploadDir = Path.Combine(Directory.GetCurrentDirectory(),
                _fileSettings.UploadPath, "comments", taskId.ToString());

            if (!Directory.Exists(uploadDir))
                Directory.CreateDirectory(uploadDir);

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadDir, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            comment.AttachmentFilePath = filePath;
            comment.AttachmentFileName = file.FileName;
        }

        _db.TaskComments.Add(comment);
        await _db.SaveChangesAsync();

        var task = await _db.Tasks
            .Include(t => t.Assignments)
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.Id == taskId);

        if (task is not null)
        {
            var authorName = $"{author.FirstName} {author.LastName}".Trim();
            var taskTitle = task.Title.Length > 50 ? task.Title[..50] + "..." : task.Title;
            var recipientIds = task.Assignments
                .Select(a => a.AssignedUserId)
                .ToList();

            // Adds the task's creator to the notification list. So if the Coordinator creates the task and an assigned employee adds the comment, the Coordinator gets notified.
            if (task.CreatedById != Guid.Empty)
                recipientIds.Add(task.CreatedById);

            recipientIds = recipientIds
                .Where(id => id != authorId)
                .Distinct()
                .ToList();

            if (recipientIds.Count > 0)
            {
                await _notificationService.SendBulkNotificationAsync(
                    recipientIds,
                    Models.Enums.NotificationType.TaskUpdated,
                    "New Comment on Task",
                    $"{authorName} commented on task '{taskTitle}'.",
                    taskId);
            }
        }

        return ApiResponseDTO<TaskCommentResponseDTO>.Success(
            await MapToResponseDTOAsync(comment),
            "Comment added successfully");
    }

    public async Task<ApiResponseDTO<PaginatedResponseDTO<TaskCommentResponseDTO>>> GetByTaskIdAsync(Guid taskId, int pageNumber = 1, int pageSize = 10)
    {
        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
            return ApiResponseDTO<PaginatedResponseDTO<TaskCommentResponseDTO>>.Failure("Task not found");

        var query = _db.TaskComments
            .Include(c => c.Author)
            .Where(c => c.TaskId == taskId && !c.IsDeleted);

        var totalCount = await query.CountAsync();

        var comments = await query
            .OrderBy(c => c.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var response = new List<TaskCommentResponseDTO>();
        foreach (var comment in comments)
        {
            response.Add(await MapToResponseDTOAsync(comment));
        }

        var paginatedResult = new PaginatedResponseDTO<TaskCommentResponseDTO>
        {
            Items = response,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        return ApiResponseDTO<PaginatedResponseDTO<TaskCommentResponseDTO>>.Success(paginatedResult);
    }

    public async Task<ApiResponseDTO<TaskCommentResponseDTO>> UpdateAsync(
        Guid commentId, string newContent, Guid userId)
    {
        var comment = await _db.TaskComments.FindAsync(commentId);
        if (comment is null)
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("Comment not found");

        if (comment.IsDeleted)
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("Cannot edit a deleted comment");

        if (comment.AuthorId != userId)
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("Unauthorized comment modification");

        if (string.IsNullOrWhiteSpace(newContent))
            return ApiResponseDTO<TaskCommentResponseDTO>.Failure("Comment content is required");

        comment.Content = newContent.Trim();
        comment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponseDTO<TaskCommentResponseDTO>.Success(
            await MapToResponseDTOAsync(comment),
            "Comment updated successfully");
    }

    public async Task<ApiResponseDTO<bool>> DeleteAsync(Guid commentId, Guid userId)
    {
        var comment = await _db.TaskComments.FindAsync(commentId);
        if (comment is null)
            return ApiResponseDTO<bool>.Failure("Comment not found");

        if (comment.AuthorId != userId)
            return ApiResponseDTO<bool>.Failure("Unauthorized comment modification");

        comment.IsDeleted = true;
        comment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true, "Comment deleted successfully");
    }

    private async Task<TaskCommentResponseDTO> MapToResponseDTOAsync(TaskComment comment)
    {
        await _db.Entry(comment).Reference(c => c.Author).LoadAsync();

        return new TaskCommentResponseDTO
        {
            Id = comment.Id,
            TaskId = comment.TaskId,
            AuthorId = comment.AuthorId,
            AuthorName = comment.Author is not null
                ? $"{comment.Author.FirstName} {comment.Author.LastName}".Trim()
                : "Unknown",
            Content = comment.Content,
            AttachmentFileName = comment.AttachmentFileName,
            IsDeleted = comment.IsDeleted,
            CreatedAt = comment.CreatedAt,
            UpdatedAt = comment.UpdatedAt
        };
    }
}
