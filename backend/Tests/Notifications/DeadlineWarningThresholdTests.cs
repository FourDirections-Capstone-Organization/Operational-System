using Xunit;
using Backend.Models.Enums;

namespace Backend.Tests.Notifications;

public class DeadlineWarningThresholdTests
{
    private TimeSpan CalculateThreshold(int value, DeadlineWarningUnit unit)
    {
        return unit == DeadlineWarningUnit.Days
            ? TimeSpan.FromDays(value)
            : TimeSpan.FromHours(value);
    }

    [Fact]
    public void Threshold_2Days_Returns48Hours()
    {
        var threshold = CalculateThreshold(2, DeadlineWarningUnit.Days);
        Assert.Equal(TimeSpan.FromHours(48), threshold);
    }

    [Fact]
    public void Threshold_48Hours_Returns48Hours()
    {
        var threshold = CalculateThreshold(48, DeadlineWarningUnit.Hours);
        Assert.Equal(TimeSpan.FromHours(48), threshold);
    }

    [Fact]
    public void Threshold_1Day_Returns24Hours()
    {
        var threshold = CalculateThreshold(1, DeadlineWarningUnit.Days);
        Assert.Equal(TimeSpan.FromHours(24), threshold);
    }

    [Fact]
    public void Threshold_3Days_Returns72Hours()
    {
        var threshold = CalculateThreshold(3, DeadlineWarningUnit.Days);
        Assert.Equal(TimeSpan.FromHours(72), threshold);
    }

    [Fact]
    public void Threshold_12Hours_Returns12Hours()
    {
        var threshold = CalculateThreshold(12, DeadlineWarningUnit.Hours);
        Assert.Equal(TimeSpan.FromHours(12), threshold);
    }

    [Fact]
    public void ShouldSendWarning_RemainingTimeLessThanThreshold()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddHours(20);
        var threshold = TimeSpan.FromHours(48);
        var remainingTime = deadline - now;

        Assert.True(remainingTime <= threshold);
    }

    [Fact]
    public void ShouldNotSendWarning_RemainingTimeGreaterThanThreshold()
    {
        var now = DateTime.UtcNow;
        var deadline = now.AddDays(5);
        var threshold = TimeSpan.FromHours(48);
        var remainingTime = deadline - now;

        Assert.False(remainingTime <= threshold);
    }

    [Fact]
    public void FormatRemainingTime_MoreThan1Day_ShowsDays()
    {
        var remaining = TimeSpan.FromHours(36);
        var formatted = remaining.TotalDays >= 1
            ? $"{remaining.TotalDays:F1} days"
            : $"{remaining.TotalHours:F1} hours";

        Assert.Equal("1.5 days", formatted);
    }

    [Fact]
    public void FormatRemainingTime_LessThan1Day_ShowsHours()
    {
        var remaining = TimeSpan.FromMinutes(90);
        var formatted = remaining.TotalDays >= 1
            ? $"{remaining.TotalDays:F1} days"
            : $"{remaining.TotalHours:F1} hours";

        Assert.Equal("1.5 hours", formatted);
    }
}
