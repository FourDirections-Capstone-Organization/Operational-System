using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.Extensions.Options;

namespace Backend.Modules.TaskManagement;

public class FileStorageSettings
{
    public string UploadPath { get; set; } = "uploads/";
    public long MaxFileSizeBytes { get; set; } = 20971520; // 20MB
    public List<string> AllowedFileTypes { get; set; } = new() { ".pdf", ".docx", ".xlsx", ".jpg", ".png" };
}

public class AttachmentService : IAttachmentService
{
    private readonly AppDbContext _db;
    private readonly FileStorageSettings _fileSettings;
    private readonly ILogger<AttachmentService> _logger;

    public AttachmentService(
        AppDbContext db,
        IOptions<FileStorageSettings> fileSettings,
        ILogger<AttachmentService> logger)
    {
        _db = db;
        _fileSettings = fileSettings.Value;
        _logger = logger;
    }

    public async Task<ApiResponseDTO<TaskAttachmentResponseDTO>> UploadAsync(
        Guid taskId, IFormFile file, string? description, Guid uploaderId)
    {
        var taskExists = await _db.Tasks.AnyAsync(t => t.Id == taskId);
        if (!taskExists)
            return ApiResponseDTO<TaskAttachmentResponseDTO>.Failure("Task not found");

        var validation = ValidateFile(file);
        if (!validation.IsValid)
            return ApiResponseDTO<TaskAttachmentResponseDTO>.Failure(validation.ErrorMessage!);

        var uploadDir = Path.Combine(Directory.GetCurrentDirectory(), _fileSettings.UploadPath, taskId.ToString());

        if (!Directory.Exists(uploadDir))
            Directory.CreateDirectory(uploadDir);

        var uniqueFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadDir, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var attachment = new TaskAttachment
        {
            TaskId = taskId,
            FileName = file.FileName,
            FilePath = filePath,
            FileSize = file.Length,
            FileType = Path.GetExtension(file.FileName).ToLower(),
            Description = description?.Trim(),
            UploadedById = uploaderId,
            CreatedAt = DateTime.UtcNow
        };

        _db.TaskAttachments.Add(attachment);
        await _db.SaveChangesAsync();

        await _db.Entry(attachment).Reference(a => a.UploadedBy).LoadAsync();

        var response = MapToResponseDTO(attachment);
        return ApiResponseDTO<TaskAttachmentResponseDTO>.Success(response, "Attachment uploaded successfully");
    }

    public async Task<ApiResponseDTO<List<TaskAttachmentResponseDTO>>> GetByTaskIdAsync(Guid taskId)
    {
        var attachments = await _db.TaskAttachments
            .Include(a => a.UploadedBy)
            .Where(a => a.TaskId == taskId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        var response = attachments.Select(MapToResponseDTO).ToList();
        return ApiResponseDTO<List<TaskAttachmentResponseDTO>>.Success(response);
    }

    public async Task<ApiResponseDTO<bool>> DeleteAsync(Guid id)
    {
        var attachment = await _db.TaskAttachments.FindAsync(id);
        if (attachment is null)
            return ApiResponseDTO<bool>.Failure("Attachment not found");

        try
        {
            if (File.Exists(attachment.FilePath))
                File.Delete(attachment.FilePath);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete file at {FilePath}", attachment.FilePath);
        }

        _db.TaskAttachments.Remove(attachment);
        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true, "Attachment deleted successfully");
    }

    public async Task<ApiResponseDTO<TaskAttachment>> GetByIdAsync(Guid id)
    {
        var attachment = await _db.TaskAttachments.FindAsync(id);
        if (attachment is null)
            return ApiResponseDTO<TaskAttachment>.Failure("Attachment not found");

        return ApiResponseDTO<TaskAttachment>.Success(attachment);
    }

    private (bool IsValid, string? ErrorMessage) ValidateFile(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return (false, "No file provided");

        var extension = Path.GetExtension(file.FileName).ToLower();

        if (!_fileSettings.AllowedFileTypes.Contains(extension))
            return (false, $"Unsupported file format. Allowed: {string.Join(", ", _fileSettings.AllowedFileTypes)}");

        if (file.Length > _fileSettings.MaxFileSizeBytes)
            return (false, $"File exceeds the maximum allowed size ({_fileSettings.MaxFileSizeBytes / 1024 / 1024}MB)");

        return (true, null);
    }

    private TaskAttachmentResponseDTO MapToResponseDTO(TaskAttachment attachment)
    {
        return new TaskAttachmentResponseDTO
        {
            Id = attachment.Id,
            TaskId = attachment.TaskId,
            FileName = attachment.FileName,
            FileSize = attachment.FileSize,
            FileType = attachment.FileType,
            Description = attachment.Description,
            UploadedById = attachment.UploadedById,
            UploadedByName = attachment.UploadedBy is not null
                ? $"{attachment.UploadedBy.FirstName} {attachment.UploadedBy.LastName}".Trim()
                : null,
            CreatedAt = attachment.CreatedAt
        };
    }
}
