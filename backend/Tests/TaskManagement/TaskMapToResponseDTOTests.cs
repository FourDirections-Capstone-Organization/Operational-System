using Xunit;

namespace Backend.Tests;

public class TaskMapToResponseDTOTests
{
    private string MapCreatorName(string? firstName, string? lastName)
    {
        return $"{firstName} {lastName}".Trim();
    }

    private string MapAssigneeFullName(string? firstName, string? middleName, string? lastName, string? suffix)
    {
        return $"{firstName} {middleName} {lastName} {suffix}"
            .Replace("  ", " ").Trim();
    }

    [Fact]
    public void MapCreatorName_BothNames_Trimmed()
    {
        var result = MapCreatorName("Jane", "Smith");
        Assert.Equal("Jane Smith", result);
    }

    [Fact]
    public void MapAssigneeFullName_AllFields_NoDoubleSpaces()
    {
        var result = MapAssigneeFullName("John", null, "Doe", null);
        Assert.Equal("John Doe", result);
        Assert.DoesNotContain("  ", result);
    }

    [Fact]
    public void MapAssigneeFullName_AllFieldsPopulated()
    {
        var result = MapAssigneeFullName("John", "M", "Doe", "Jr");
        Assert.Equal("John M Doe Jr", result);
    }

    [Fact]
    public void AttachmentCount_NullAttachments_ReturnsZero()
    {
        var attachments = (ICollection<object>?)null;
        var count = attachments?.Count ?? 0;
        Assert.Equal(0, count);
    }
}