using Xunit;

namespace Backend.Tests.Reporting;

public class PerformanceReportTests
{
    private static (DateTime Start, DateTime End) CalculateDateRange(
        string period, DateTime? explicitStart, DateTime? explicitEnd, DateTime now)
    {
        if (explicitStart.HasValue && explicitEnd.HasValue)
            return (explicitStart.Value, explicitEnd.Value);

        switch (period)
        {
            case "Weekly":
                var daysSinceMonday = ((int)now.DayOfWeek + 6) % 7;
                var weekStart = now.Date.AddDays(-daysSinceMonday);
                var weekEnd = weekStart.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);
                return (weekStart, weekEnd);

            case "Monthly":
                var monthStart = new DateTime(now.Year, now.Month, 1);
                var monthEnd = monthStart.AddMonths(1).AddSeconds(-1);
                return (monthStart, monthEnd);

            default:
                var defaultStart = now.AddMonths(-1);
                return (defaultStart, now);
        }
    }

    [Fact]
    public void WeeklyPeriod_StartsOnMonday()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (start, _) = CalculateDateRange("Weekly", null, null, now);
        Assert.Equal(DayOfWeek.Monday, start.DayOfWeek);
    }

    [Fact]
    public void WeeklyPeriod_EndsOnSunday()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (_, end) = CalculateDateRange("Weekly", null, null, now);
        Assert.Equal(DayOfWeek.Sunday, end.DayOfWeek);
    }

    [Fact]
    public void WeeklyPeriod_DateRangeIsSevenDays()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (start, end) = CalculateDateRange("Weekly", null, null, now);
        var diff = end - start;
        Assert.Equal(6, diff.Days);
    }

    [Fact]
    public void WeeklyPeriod_EndOfWeek_Has59Seconds()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (_, end) = CalculateDateRange("Weekly", null, null, now);
        Assert.Equal(23, end.Hour);
        Assert.Equal(59, end.Minute);
        Assert.Equal(59, end.Second);
    }

    [Fact]
    public void MonthlyPeriod_StartsOnFirstDay()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (start, _) = CalculateDateRange("Monthly", null, null, now);
        Assert.Equal(1, start.Day);
        Assert.Equal(7, start.Month);
        Assert.Equal(2026, start.Year);
    }

    [Fact]
    public void MonthlyPeriod_EndsOnLastDay()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (_, end) = CalculateDateRange("Monthly", null, null, now);
        Assert.Equal(31, end.Day);
        Assert.Equal(7, end.Month);
        Assert.Equal(2026, end.Year);
    }

    [Fact]
    public void MonthlyPeriod_EndOfMonth_Has59Seconds()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (_, end) = CalculateDateRange("Monthly", null, null, now);
        Assert.Equal(23, end.Hour);
        Assert.Equal(59, end.Minute);
        Assert.Equal(59, end.Second);
    }

    [Fact]
    public void CustomDateRange_OverridesPeriod()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var customStart = new DateTime(2026, 1, 1);
        var customEnd = new DateTime(2026, 1, 31, 23, 59, 59);
        var (start, end) = CalculateDateRange("Weekly", customStart, customEnd, now);
        Assert.Equal(customStart, start);
        Assert.Equal(customEnd, end);
    }

    [Fact]
    public void UnknownPeriod_FallsBackToLastMonth()
    {
        var now = new DateTime(2026, 7, 14, 10, 0, 0);
        var (start, end) = CalculateDateRange("Invalid", null, null, now);
        Assert.Equal(now.AddMonths(-1), start);
        Assert.Equal(now, end);
    }

    [Fact]
    public void WednesdayInWeek_WeeklyRange_CoversMondayToSunday()
    {
        var now = new DateTime(2026, 7, 8, 10, 0, 0);
        var (start, end) = CalculateDateRange("Weekly", null, null, now);
        Assert.Equal(new DateTime(2026, 7, 6), start);
        Assert.Equal(new DateTime(2026, 7, 12, 23, 59, 59), end);
    }

    [Fact]
    public void February2026_MonthlyRange_28Days()
    {
        var now = new DateTime(2026, 2, 14, 10, 0, 0);
        var (start, end) = CalculateDateRange("Monthly", null, null, now);
        Assert.Equal(new DateTime(2026, 2, 1), start);
        Assert.Equal(new DateTime(2026, 2, 28, 23, 59, 59), end);
    }

    [Fact]
    public void SundayIsWeekStart_WeeklyRange_CurrentWeek()
    {
        var now = new DateTime(2026, 7, 12, 10, 0, 0);
        var (start, end) = CalculateDateRange("Weekly", null, null, now);
        Assert.Equal(new DateTime(2026, 7, 6), start);
        Assert.Equal(new DateTime(2026, 7, 12, 23, 59, 59), end);
    }
}
