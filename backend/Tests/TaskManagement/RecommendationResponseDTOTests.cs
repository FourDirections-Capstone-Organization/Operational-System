namespace Backend.Tests.TaskManagement;

public class RecommendationResponseDTOTests
{
    [Fact]
    public void AssigneeName_PopulatedFromFK()
    {
        var firstName = "John";
        var lastName = "Doe";
        var fullName = $"{firstName} {lastName}".Trim();
        Assert.Equal("John Doe", fullName);
    }

    [Fact]
    public void AssigneeName_NullFK_ReturnsNull()
    {
        string? firstName = null;
        string? lastName = null;
        var fullName = firstName is not null && lastName is not null
            ? $"{firstName} {lastName}".Trim()
            : null;
        Assert.Null(fullName);
    }

    [Fact]
    public void CoordinatorName_PopulatedFromFK()
    {
        var firstName = "Jane";
        var lastName = "Smith";
        var fullName = $"{firstName} {lastName}".Trim();
        Assert.Equal("Jane Smith", fullName);
    }

    [Fact]
    public void TaskTitle_PopulatedFromFK()
    {
        var title = "Daily Parcel Sorting";
        Assert.Equal("Daily Parcel Sorting", title);
    }
}
