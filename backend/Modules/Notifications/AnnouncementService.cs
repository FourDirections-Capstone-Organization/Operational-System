using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.TaskManagement;

namespace Backend.Modules.Notifications;

public class AnnouncementService : IAnnouncementService
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notificationService;
    private readonly IAuditLogService _auditLogService;

    public AnnouncementService(AppDbContext db, INotificationService notificationService, IAuditLogService auditLogService)
    {
        _db = db;
        _notificationService = notificationService;
        _auditLogService = auditLogService;
    }

    public async Task<ApiResponseDTO<AnnouncementResponseDTO>> CreateAsync(CreateAnnouncementDTO dto, Guid creatorId)
    {
        var creator = await _db.Users.FindAsync(creatorId);
        if (creator is null)
            return ApiResponseDTO<AnnouncementResponseDTO>.Failure("Creator not found");

        if (creator.Role != UserRole.Coordinator && creator.Role != UserRole.Manager)
            return ApiResponseDTO<AnnouncementResponseDTO>.Failure("Only Coordinators and Managers can publish announcements");

        if (dto.ExpiryDate.HasValue && dto.ExpiryDate.Value < dto.EffectiveDate)
            return ApiResponseDTO<AnnouncementResponseDTO>.Failure("Expiry date must not precede effective date");

        var announcement = new Announcement
        {
            Title = dto.Title.Trim(),
            Content = dto.Content.Trim(),
            TargetRoles = dto.TargetRoles?.Trim(),
            EffectiveDate = DateTime.SpecifyKind(dto.EffectiveDate, DateTimeKind.Utc),
            ExpiryDate = dto.ExpiryDate.HasValue ? DateTime.SpecifyKind(dto.ExpiryDate.Value, DateTimeKind.Utc) : null,
            CreatedById = creatorId,
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync();

        var recipients = await GetTargetUserIds(dto.TargetRoles);
        if (recipients.Count > 0)
        {
            var title = announcement.Title.Length > 100 ? announcement.Title[..100] + "..." : announcement.Title;
            await _notificationService.SendBulkNotificationAsync(
                recipients, NotificationType.TaskAssigned, "New Announcement",
                $"New announcement: {title}", null);
        }

        var creatorName = $"{creator.FirstName} {creator.LastName}".Trim();
        await _auditLogService.LogAsync(creatorId, AuditActionType.Create, "Announcement", announcement.Id, null,
            $"Announcement published: '{announcement.Title}' by {creatorName}. Target: {dto.TargetRoles ?? "All Users"}", "Announcements");

        return ApiResponseDTO<AnnouncementResponseDTO>.Success(MapToDTO(announcement, creatorName, creator.Role.ToString(), false, 0, new(), new()), "Announcement published successfully");
    }

    public async Task<ApiResponseDTO<List<AnnouncementResponseDTO>>> GetActiveAsync(string? userRole, Guid? currentUserId)
    {
        var now = DateTime.UtcNow;

        var query = _db.Announcements
            .Include(a => a.CreatedBy)
            .Where(a => a.IsPublished && a.EffectiveDate <= now)
            .Where(a => !a.ExpiryDate.HasValue || a.ExpiryDate.Value >= now);

        if (!string.IsNullOrEmpty(userRole))
        {
            query = query.Where(a => string.IsNullOrEmpty(a.TargetRoles)
                || a.TargetRoles!.Contains("All")
                || a.TargetRoles!.Contains(userRole));
        }

        var announcements = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();

        var result = new List<AnnouncementResponseDTO>();
        foreach (var a in announcements)
        {
            var name = a.CreatedBy is not null ? $"{a.CreatedBy.FirstName} {a.CreatedBy.LastName}".Trim() : "Unknown";
            var role = a.CreatedBy?.Role.ToString() ?? "";

            var acknowledgments = await _db.AnnouncementAcknowledgments
                .Where(x => x.AnnouncementId == a.Id)
                .Include(x => x.User)
                .ToListAsync();

            var comments = await _db.AnnouncementComments
                .Where(c => c.AnnouncementId == a.Id)
                .Include(c => c.User)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            var isAcknowledged = currentUserId.HasValue && acknowledgments.Any(x => x.UserId == currentUserId.Value);

            result.Add(MapToDTO(a, name, role, isAcknowledged, acknowledgments.Count,
                acknowledgments.Select(x => new AcknowledgmentUserDTO
                {
                    UserId = x.UserId,
                    FullName = x.User is not null ? $"{x.User.FirstName} {x.User.LastName}".Trim() : "Unknown",
                    AcknowledgedAt = x.CreatedAt
                }).ToList(),
                comments.Select(c => new CommentDTO
                {
                    Id = c.Id,
                    UserId = c.UserId,
                    FullName = c.User is not null ? $"{c.User.FirstName} {c.User.LastName}".Trim() : "Unknown",
                    Content = c.Content,
                    CreatedAt = c.CreatedAt
                }).ToList()));
        }

        return ApiResponseDTO<List<AnnouncementResponseDTO>>.Success(result);
    }

    public async Task<ApiResponseDTO<List<AnnouncementResponseDTO>>> GetAllAsync()
    {
        var announcements = await _db.Announcements.Include(a => a.CreatedBy).OrderByDescending(a => a.CreatedAt).ToListAsync();

        var result = announcements.Select(a =>
        {
            var name = a.CreatedBy is not null ? $"{a.CreatedBy.FirstName} {a.CreatedBy.LastName}".Trim() : "Unknown";
            var role = a.CreatedBy?.Role.ToString() ?? "";
            return MapToDTO(a, name, role, false, 0, new(), new());
        }).ToList();

        return ApiResponseDTO<List<AnnouncementResponseDTO>>.Success(result);
    }

    public async Task<ApiResponseDTO<bool>> AcknowledgeAsync(Guid announcementId, Guid userId)
    {
        var announcement = await _db.Announcements.FindAsync(announcementId);
        if (announcement is null)
            return ApiResponseDTO<bool>.Failure("Announcement not found");

        var existing = await _db.AnnouncementAcknowledgments
            .AnyAsync(x => x.AnnouncementId == announcementId && x.UserId == userId);

        if (existing)
            return ApiResponseDTO<bool>.Failure("You have already acknowledged this announcement");

        _db.AnnouncementAcknowledgments.Add(new AnnouncementAcknowledgment
        {
            AnnouncementId = announcementId,
            UserId = userId
        });
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var userName = user is not null ? $"{user.FirstName} {user.LastName}".Trim() : "Unknown";
        await _auditLogService.LogAsync(userId, AuditActionType.Create, "AnnouncementAcknowledgment", announcementId, null,
            $"User {userName} acknowledged announcement '{announcement.Title}'", "Announcements");

        return ApiResponseDTO<bool>.Success(true, "Announcement acknowledged");
    }

    public async Task<ApiResponseDTO<CommentDTO>> AddCommentAsync(Guid announcementId, Guid userId, string content)
    {
        var announcement = await _db.Announcements.FindAsync(announcementId);
        if (announcement is null)
            return ApiResponseDTO<CommentDTO>.Failure("Announcement not found");

        var comment = new AnnouncementComment
        {
            AnnouncementId = announcementId,
            UserId = userId,
            Content = content.Trim()
        };
        _db.AnnouncementComments.Add(comment);
        await _db.SaveChangesAsync();

        var user = await _db.Users.FindAsync(userId);
        var userName = user is not null ? $"{user.FirstName} {user.LastName}".Trim() : "Unknown";
        await _auditLogService.LogAsync(userId, AuditActionType.Create, "AnnouncementComment", announcementId, null,
            $"User {userName} commented on announcement '{announcement.Title}'", "Announcements");

        return ApiResponseDTO<CommentDTO>.Success(new CommentDTO
        {
            Id = comment.Id,
            UserId = userId,
            FullName = userName,
            Content = comment.Content,
            CreatedAt = comment.CreatedAt
        }, "Comment added");
    }

    private async Task<List<Guid>> GetTargetUserIds(string? targetRoles)
    {
        if (string.IsNullOrEmpty(targetRoles) || targetRoles.Contains("All"))
            return await _db.Users.Where(u => u.IsActive && !u.IsDeactivated).Select(u => u.Id).ToListAsync();

        var roles = targetRoles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var roleEnums = roles.Select(r => Enum.TryParse<UserRole>(r, true, out var val) ? val : (UserRole?)null)
            .Where(r => r.HasValue).Select(r => r!.Value).ToList();

        return await _db.Users.Where(u => roleEnums.Contains(u.Role) && u.IsActive && !u.IsDeactivated)
            .Select(u => u.Id).ToListAsync();
    }

    private static AnnouncementResponseDTO MapToDTO(Announcement a, string creatorName, string creatorRole,
        bool isAcknowledged, int ackCount, List<AcknowledgmentUserDTO> acks, List<CommentDTO> comments)
    {
        return new AnnouncementResponseDTO
        {
            Id = a.Id,
            Title = a.Title,
            Content = a.Content,
            TargetRoles = a.TargetRoles,
            EffectiveDate = a.EffectiveDate,
            ExpiryDate = a.ExpiryDate,
            CreatedByName = creatorName,
            CreatedByRole = creatorRole,
            CreatedAt = a.CreatedAt,
            IsAcknowledged = isAcknowledged,
            AcknowledgmentCount = ackCount,
            Acknowledgments = acks,
            Comments = comments
        };
    }
}
