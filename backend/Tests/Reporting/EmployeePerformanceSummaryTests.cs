using Xunit;

namespace Backend.Tests.Reporting;

public class EmployeePerformanceSummaryTests
{
    private static double CalculateSlaComplianceRate(int onTimeCount, int totalCompleted)
    {
        if (totalCompleted == 0)
            return 0;

        return Math.Round((double)onTimeCount / totalCompleted * 100, 1);
    }

    private static string FormatEmployeeName(string? firstName, string? lastName)
    {
        if (string.IsNullOrWhiteSpace(firstName) && string.IsNullOrWhiteSpace(lastName))
            return "Unknown";

        return $"{firstName ?? ""} {lastName ?? ""}".Trim();
    }

    [Fact]
    public void AllTasksOnTime_SlaRateIs100Percent()
    {
        var rate = CalculateSlaComplianceRate(10, 10);
        Assert.Equal(100.0, rate);
    }

    [Fact]
    public void NoCompletedTasks_SlaRateIsZero()
    {
        var rate = CalculateSlaComplianceRate(0, 0);
        Assert.Equal(0.0, rate);
    }

    [Fact]
    public void PartialCompliance_RateMatchesCalculation()
    {
        var rate = CalculateSlaComplianceRate(7, 10);
        Assert.Equal(70.0, rate);
    }

    [Fact]
    public void SingleTaskOnTime_RateIs100Percent()
    {
        var rate = CalculateSlaComplianceRate(1, 1);
        Assert.Equal(100.0, rate);
    }

    [Fact]
    public void SingleTaskLate_RateIsZero()
    {
        var rate = CalculateSlaComplianceRate(0, 1);
        Assert.Equal(0.0, rate);
    }

    [Fact]
    public void RateRoundsToOneDecimalPlace()
    {
        var rate = CalculateSlaComplianceRate(2, 3);
        Assert.Equal(66.7, rate);
    }

    [Fact]
    public void AllLate_SomeCompleted_RateIsZero()
    {
        var rate = CalculateSlaComplianceRate(0, 5);
        Assert.Equal(0.0, rate);
    }

    [Fact]
    public void FormatEmployeeName_BothNamesPresent_ReturnsFullName()
    {
        var name = FormatEmployeeName("John", "Doe");
        Assert.Equal("John Doe", name);
    }

    [Fact]
    public void FormatEmployeeName_NullFirstName_ReturnsLastNameOnly()
    {
        var name = FormatEmployeeName(null, "Doe");
        Assert.Equal("Doe", name);
    }

    [Fact]
    public void FormatEmployeeName_NullLastName_ReturnsFirstNameOnly()
    {
        var name = FormatEmployeeName("John", null);
        Assert.Equal("John", name);
    }

    [Fact]
    public void FormatEmployeeName_BothNull_ReturnsUnknown()
    {
        var name = FormatEmployeeName(null, null);
        Assert.Equal("Unknown", name);
    }

    [Fact]
    public void FormatEmployeeName_EmptyStrings_ReturnsUnknown()
    {
        var name = FormatEmployeeName("", "");
        Assert.Equal("Unknown", name);
    }

    [Fact]
    public void FormatEmployeeName_Whitespace_ReturnsUnknown()
    {
        var name = FormatEmployeeName("   ", "   ");
        Assert.Equal("Unknown", name);
    }
}
