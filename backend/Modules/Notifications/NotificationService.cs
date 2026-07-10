using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Backend.Modules.Email;

namespace Backend.Modules.Notifications;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext db, IEmailService emailService, ILogger<NotificationService> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<Notification> CreateNotificationAsync(
        Guid recipientId, NotificationType type, string title, string message, Guid? taskId = null)
    {
        var notification = new Notification
        {
            RecipientId = recipientId,
            Type = type,
            Title = title,
            Message = message,
            RelatedTaskId = taskId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync();

        return notification;
    }

    public async Task SendNotificationAsync(
        Guid recipientId, NotificationType type, string title, string message, Guid? taskId = null)
    {
        await CreateNotificationAsync(recipientId, type, title, message, taskId);

        var recipient = await _db.Users.FindAsync(recipientId);
        if (recipient is not null)
        {
            var fullName = $"{recipient.FirstName} {recipient.LastName}".Trim();
            try
            {
                await _emailService.SendTaskNotificationEmailAsync(
                    recipient.Email, fullName, title, message);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send email notification to {Email}", recipient.Email);
            }
        }
    }

    public async Task SendBulkNotificationAsync(
        List<Guid> recipientIds, NotificationType type, string title, string message, Guid? taskId = null)
    {
        foreach (var recipientId in recipientIds)
        {
            await SendNotificationAsync(recipientId, type, title, message, taskId);
        }
    }

    public async Task<ApiResponseDTO<List<NotificationResponseDTO>>> GetByRecipientAsync(Guid recipientId)
    {
        var notifications = await _db.Notifications
            .Where(n => n.RecipientId == recipientId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationResponseDTO
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                RelatedTaskId = n.RelatedTaskId,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();

        return ApiResponseDTO<List<NotificationResponseDTO>>.Success(notifications);
    }

    public async Task<ApiResponseDTO<int>> GetUnreadCountAsync(Guid recipientId)
    {
        var count = await _db.Notifications
            .CountAsync(n => n.RecipientId == recipientId && !n.IsRead);

        return ApiResponseDTO<int>.Success(count);
    }

    public async Task<ApiResponseDTO<bool>> MarkAsReadAsync(Guid notificationId, Guid recipientId)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.RecipientId == recipientId);

        if (notification is null)
            return ApiResponseDTO<bool>.Failure("Notification not found");

        notification.IsRead = true;
        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true);
    }

    public async Task<ApiResponseDTO<bool>> MarkAllAsReadAsync(Guid recipientId)
    {
        var unreadNotifications = await _db.Notifications
            .Where(n => n.RecipientId == recipientId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
        }

        await _db.SaveChangesAsync();

        return ApiResponseDTO<bool>.Success(true, "All notifications marked as read");
    }
}