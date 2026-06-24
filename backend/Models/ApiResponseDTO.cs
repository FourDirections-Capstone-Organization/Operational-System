namespace Backend.Models;

public class ApiResponseDTO<T>
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }

    public static ApiResponseDTO<T> Success(T? data, string message = "Success")
    {
        return new ApiResponseDTO<T>
        {
            IsSuccess = true,
            Message = message,
            Data = data
        };
    }

    public static ApiResponseDTO<T> Failure(string message)
    {
        return new ApiResponseDTO<T>
        {
            IsSuccess = false,
            Message = message,
            Data = default
        };
    }
}
