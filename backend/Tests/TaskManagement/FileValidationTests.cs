using Xunit;

namespace Backend.Tests;

public class FileValidationTests
{
    private static readonly List<string> AllowedFileTypes = new() { ".pdf", ".docx", ".xlsx", ".jpg", ".png" };
    private const long MaxFileSizeBytes = 20971520;

    private (bool IsValid, string? ErrorMessage) ValidateFile(long fileSize, string? extension)
    {
        if (fileSize == 0)
            return (false, "No file provided");

        if (extension is null || !AllowedFileTypes.Contains(extension.ToLower()))
            return (false, $"Unsupported file format. Allowed: {string.Join(", ", AllowedFileTypes)}");

        if (fileSize > MaxFileSizeBytes)
            return (false, $"File exceeds the maximum allowed size (20MB)");

        return (true, null);
    }

    [Fact]
    public void ValidateFile_PdfAccepted()
    {
        var (isValid, _) = ValidateFile(1024, ".pdf");
        Assert.True(isValid);
    }

    [Fact]
    public void ValidateFile_AllAllowedTypes_Accepted()
    {
        foreach (var ext in AllowedFileTypes)
        {
            var (isValid, _) = ValidateFile(1024, ext);
            Assert.True(isValid);
        }
    }

    [Fact]
    public void ValidateFile_UnsupportedType_Rejected()
    {
        var (isValid, error) = ValidateFile(1024, ".exe");
        Assert.False(isValid);
        Assert.Contains("Unsupported file format", error);
    }

    [Fact]
    public void ValidateFile_Exceeds20MB_Rejected()
    {
        var (isValid, error) = ValidateFile(25_000_000, ".pdf");
        Assert.False(isValid);
        Assert.Contains("exceeds the maximum allowed size", error);
    }

    [Fact]
    public void ValidateFile_EmptyFile_Rejected()
    {
        var (isValid, error) = ValidateFile(0, ".pdf");
        Assert.False(isValid);
        Assert.Contains("No file provided", error);
    }
}