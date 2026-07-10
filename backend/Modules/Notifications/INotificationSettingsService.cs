using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.Notifications;

public interface INotificationSettingsService
{
    Task<ApiResponseDTO<NotificationSettingsDTO>> GetSettingsAsync();
    Task<ApiResponseDTO<NotificationSettingsDTO>> UpdateSettingsAsync(NotificationSettingsDTO dto);
    Task<NotificationSettings> GetSettingsEntityAsync();
    Task SeedDefaultSettingsAsync();
}