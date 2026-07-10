using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.Extensions.Options;

namespace Backend.Modules.TaskManagement;

public class TaskCommentService : ITaskCommentService
{
    private readonly AppDbContext _db;
    private readonly FileStorageSettings _fileSettings;
    private readonly ILogger<TaskCommentService> _logger;

    public TaskCommentService(
        AppDbContext db,
        IOptions<FileStorageSettings> fileSettings,
        ILogger<TaskCommentService> logger)
    {
        _db = db;
        _fileSettings = fileSettings.Value;
        _logger = logger;
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

        return ApiResponseDTO<TaskCommentResponseDTO>.Success(
            await MapToResponseDTOAsync(comment),
            "Comment added successfully");
    }

    public async Task<ApiResponseDTO<List<TaskCommentResponseDTO>>> GetByTaskIdAsync(Guid taskId)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
            return ApiResponseDTO<List<TaskCommentResponseDTO>>.Failure("Task not found");

        var comments = await _db.TaskComments
            .Include(c => c.Author)
            .Where(c => c.TaskId == taskId && !c.IsDeleted)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();

        var response = new List<TaskCommentResponseDTO>();
        foreach (var comment in comments)
        {
            response.Add(await MapToResponseDTOAsync(comment));
        }

        return ApiResponseDTO<List<TaskCommentResponseDTO>>.Success(response);
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
