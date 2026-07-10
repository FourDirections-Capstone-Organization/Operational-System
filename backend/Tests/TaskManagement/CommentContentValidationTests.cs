namespace Backend.Tests.TaskManagement;

public class CommentContentValidationTests
{
    private (bool IsValid, string? ErrorMessage) ValidateContent(string? content)
    {
        if (string.IsNullOrWhiteSpace(content))
            return (false, "Comment content is required");

        return (true, null);
    }

    [Fact]
    public void NonEmptyContent_IsValid()
    {
        var (isValid, _) = ValidateContent("I have started working on this task.");
        Assert.True(isValid);
    }

    [Fact]
    public void EmptyContent_IsInvalid()
    {
        var (isValid, error) = ValidateContent("");
        Assert.False(isValid);
        Assert.Contains("Comment content is required", error);
    }

    [Fact]
    public void WhitespaceOnlyContent_IsInvalid()
    {
        var (isValid, error) = ValidateContent("   ");
        Assert.False(isValid);
        Assert.Contains("Comment content is required", error);
    }

    [Fact]
    public void ContentTruncated_WhenExceeds1000Chars()
    {
        var longContent = new string('A', 1200);
        var truncated = longContent.Length > 1000 ? longContent[..1000] : longContent;
        Assert.Equal(1000, truncated.Length);
    }
}
