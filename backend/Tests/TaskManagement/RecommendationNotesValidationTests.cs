namespace Backend.Tests.TaskManagement;

public class RecommendationNotesValidationTests
{
    private (bool IsValid, string? ErrorMessage) ValidateNotes(string? notes)
    {
        if (string.IsNullOrWhiteSpace(notes))
            return (false, "Recommendation notes are required");

        return (true, null);
    }

    [Fact]
    public void NonEmptyNotes_IsValid()
    {
        var (isValid, _) = ValidateNotes("John consistently produces accurate work.");
        Assert.True(isValid);
    }

    [Fact]
    public void EmptyNotes_IsInvalid()
    {
        var (isValid, error) = ValidateNotes("");
        Assert.False(isValid);
        Assert.Contains("notes are required", error);
    }

    [Fact]
    public void WhitespaceNotes_IsInvalid()
    {
        var (isValid, error) = ValidateNotes("   ");
        Assert.False(isValid);
        Assert.Contains("notes are required", error);
    }
}
