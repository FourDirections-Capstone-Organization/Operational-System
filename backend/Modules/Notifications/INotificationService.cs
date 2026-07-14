using Backend.Models;
using Backend.Models.DTOs;
using Backend.Models.Enums;
using Task = System.Threading.Tasks.Task;

namespace Backend.Modules.Notifications;

public interface INotificationService
{
    Task<Notification> CreateNotificationAsync(
        Guid recipientId, NotificationType type, string title, string message, Guid? taskId = null);

    Task SendNotificationAsync(
        Guid recipientId, NotificationType type, string title, string message, Guid? taskId = null);

    Task SendBulkNotificationAsync(
        List<Guid> recipientIds, NotificationType type, string title, string message, Guid? taskId = null);

    Task<ApiResponseDTO<PaginatedResponseDTO<NotificationResponseDTO>>> GetByRecipientAsync(Guid recipientId, int pageNumber = 1, int pageSize = 10);
    Task<ApiResponseDTO<int>> GetUnreadCountAsync(Guid recipientId);
    Task<ApiResponseDTO<bool>> MarkAsReadAsync(Guid notificationId, Guid recipientId);
    Task<ApiResponseDTO<bool>> MarkAllAsReadAsync(Guid recipientId);
}