using Backend.Models;
using Backend.Models.DTOs;

namespace Backend.Modules.Utilities;

public interface IDuplicateDetectionService
{
    Task<ApiResponseDTO<DuplicateCheckResultDTO>> CheckForDuplicatesAsync(
        string title, string description, Guid? excludeTaskId = null);
}
