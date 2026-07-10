using Backend.Models.Enums;

namespace Backend.Tests.TaskManagement;

public class NextGenerationDateCalculationTests
{
    private DateTime CalculateNextGenerationDate(DateTime fromDate, RecurrenceRule rule)
    {
        return rule switch
        {
            RecurrenceRule.Daily => fromDate.AddDays(1),
            RecurrenceRule.Weekly => fromDate.AddDays(7),
            RecurrenceRule.Monthly => fromDate.AddMonths(1),
            _ => fromDate.AddDays(1)
        };
    }

    [Fact]
    public void Daily_AddsOneDay()
    {
        var from = new DateTime(2026, 7, 10, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Daily);
        Assert.Equal(new DateTime(2026, 7, 11, 6, 0, 0), next);
    }

    [Fact]
    public void Weekly_AddsSevenDays()
    {
        var from = new DateTime(2026, 7, 10, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Weekly);
        Assert.Equal(new DateTime(2026, 7, 17, 6, 0, 0), next);
    }

    [Fact]
    public void Monthly_AddsOneMonth()
    {
        var from = new DateTime(2026, 7, 10, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Monthly);
        Assert.Equal(new DateTime(2026, 8, 10, 6, 0, 0), next);
    }

    [Fact]
    public void Monthly_FromJan31_ReturnsFeb28()
    {
        var from = new DateTime(2026, 1, 31, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Monthly);
        Assert.Equal(new DateTime(2026, 2, 28, 6, 0, 0), next);
    }

    [Fact]
    public void Daily_CrossesYearBoundary()
    {
        var from = new DateTime(2026, 12, 31, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Daily);
        Assert.Equal(new DateTime(2027, 1, 1, 6, 0, 0), next);
    }

    [Fact]
    public void Weekly_CrossesMonthBoundary()
    {
        var from = new DateTime(2026, 7, 28, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Weekly);
        Assert.Equal(new DateTime(2026, 8, 4, 6, 0, 0), next);
    }

    [Fact]
    public void MultipleDailyGenerations_AreCorrect()
    {
        var date = new DateTime(2026, 7, 10, 6, 0, 0);
        date = CalculateNextGenerationDate(date, RecurrenceRule.Daily);
        Assert.Equal(new DateTime(2026, 7, 11, 6, 0, 0), date);

        date = CalculateNextGenerationDate(date, RecurrenceRule.Daily);
        Assert.Equal(new DateTime(2026, 7, 12, 6, 0, 0), date);

        date = CalculateNextGenerationDate(date, RecurrenceRule.Daily);
        Assert.Equal(new DateTime(2026, 7, 13, 6, 0, 0), date);
    }

    [Fact]
    public void Monthly_SameDayOfMonth()
    {
        var from = new DateTime(2026, 3, 15, 6, 0, 0);
        var next = CalculateNextGenerationDate(from, RecurrenceRule.Monthly);
        Assert.Equal(new DateTime(2026, 4, 15, 6, 0, 0), next);
    }
}
