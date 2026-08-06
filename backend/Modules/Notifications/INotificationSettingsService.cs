using Backend.Models;
using Backend.Models.DTOs;
using Task = System.Threading.Tasks.Task;

namespace Backend.Modules.Notifications;

public interface INotificationSettingsService
{
    Task<ApiResponseDTO<NotificationSettingsDTO>> GetSettingsAsync();
    Task<ApiResponseDTO<NotificationSettingsDTO>> UpdateSettingsAsync(NotificationSettingsDTO dto, Guid? updatedByUserId = null);
    Task<NotificationSettings> GetSettingsEntityAsync();
    Task SeedDefaultSettingsAsync();
}