using Microsoft.AspNetCore.Http;

namespace Backend.Tests.TaskManagement;

public class CommentFileValidationTests
{
    private static readonly List<string> AllowedFileTypes = new() { ".pdf", ".docx", ".xlsx", ".jpg", ".png" };
    private const long MaxFileSizeBytes = 20971520;

    private (bool IsValid, string? ErrorMessage) ValidateFile(IFormFile? file)
    {
        if (file is null || file.Length == 0)
            return (true, null);

        var extension = Path.GetExtension(file.FileName).ToLower();
        if (!AllowedFileTypes.Contains(extension))
            return (false, $"Unsupported file format. Allowed: {string.Join(", ", AllowedFileTypes)}");

        if (file.Length > MaxFileSizeBytes)
            return (false, $"File exceeds the maximum allowed size ({MaxFileSizeBytes / 1024 / 1024}MB)");

        return (true, null);
    }

    [Fact]
    public void ValidPdfFile_IsAccepted()
    {
        var file = new FormFile(new MemoryStream(new byte[1024]), 0, 1024, "file", "report.pdf");
        var (isValid, _) = ValidateFile(file);
        Assert.True(isValid);
    }

    [Fact]
    public void ValidDocxFile_IsAccepted()
    {
        var file = new FormFile(new MemoryStream(new byte[1024]), 0, 1024, "file", "memo.docx");
        var (isValid, _) = ValidateFile(file);
        Assert.True(isValid);
    }

    [Fact]
    public void InvalidExeFile_IsRejected()
    {
        var file = new FormFile(new MemoryStream(new byte[1024]), 0, 1024, "file", "virus.exe");
        var (isValid, error) = ValidateFile(file);
        Assert.False(isValid);
        Assert.Contains("Unsupported file format", error);
    }

    [Fact]
    public void OversizedFile_IsRejected()
    {
        var file = new FormFile(new MemoryStream(new byte[25_000_000]), 0, 25_000_000, "file", "huge.pdf");
        var (isValid, error) = ValidateFile(file);
        Assert.False(isValid);
        Assert.Contains("exceeds the maximum allowed size", error);
    }

    [Fact]
    public void NullFile_IsAccepted()
    {
        var (isValid, _) = ValidateFile(null);
        Assert.True(isValid);
    }
}
