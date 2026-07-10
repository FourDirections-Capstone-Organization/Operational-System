using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.Notifications;

public class NotificationSettingsService : INotificationSettingsService
{
    private readonly AppDbContext _db;

    public NotificationSettingsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ApiResponseDTO<NotificationSettingsDTO>> GetSettingsAsync()
    {
        var settings = await _db.NotificationSettings.FirstOrDefaultAsync();

        if (settings is null)
        {
            settings = new NotificationSettings
            {
                DeadlineWarningValue = 2,
                DeadlineWarningUnit = Models.Enums.DeadlineWarningUnit.Days,
                UpdatedAt = DateTime.UtcNow
            };
            _db.NotificationSettings.Add(settings);
            await _db.SaveChangesAsync();
        }

        var response = new NotificationSettingsDTO
        {
            DeadlineWarningValue = settings.DeadlineWarningValue,
            DeadlineWarningUnit = settings.DeadlineWarningUnit
        };

        return ApiResponseDTO<NotificationSettingsDTO>.Success(response);
    }

    public async Task<ApiResponseDTO<NotificationSettingsDTO>> UpdateSettingsAsync(NotificationSettingsDTO dto)
    {
        if (dto.DeadlineWarningValue <= 0)
            return ApiResponseDTO<NotificationSettingsDTO>.Failure("Threshold value must be a positive number");

        var settings = await _db.NotificationSettings.FirstOrDefaultAsync();

        if (settings is null)
        {
            settings = new NotificationSettings();
            _db.NotificationSettings.Add(settings);
        }

        settings.DeadlineWarningValue = dto.DeadlineWarningValue;
        settings.DeadlineWarningUnit = dto.DeadlineWarningUnit;
        settings.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        var response = new NotificationSettingsDTO
        {
            DeadlineWarningValue = settings.DeadlineWarningValue,
            DeadlineWarningUnit = settings.DeadlineWarningUnit
        };

        return ApiResponseDTO<NotificationSettingsDTO>.Success(response, "Deadline warning threshold updated successfully");
    }

    public async Task<NotificationSettings> GetSettingsEntityAsync()
    {
        var settings = await _db.NotificationSettings.FirstOrDefaultAsync();

        if (settings is null)
        {
            settings = new NotificationSettings
            {
                DeadlineWarningValue = 2,
                DeadlineWarningUnit = Models.Enums.DeadlineWarningUnit.Days,
                UpdatedAt = DateTime.UtcNow
            };
            _db.NotificationSettings.Add(settings);
            await _db.SaveChangesAsync();
        }

        return settings;
    }

    public async Task SeedDefaultSettingsAsync()
    {
        var exists = await _db.NotificationSettings.AnyAsync();

        if (!exists)
        {
            _db.NotificationSettings.Add(new NotificationSettings
            {
                DeadlineWarningValue = 2,
                DeadlineWarningUnit = Models.Enums.DeadlineWarningUnit.Days,
                UpdatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
        }
    }
}