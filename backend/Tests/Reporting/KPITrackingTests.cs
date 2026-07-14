using Xunit;

namespace Backend.Tests.Reporting;

public class KPITrackingTests
{
    private static string ClassifyTask(DateTime? updatedAt, DateTime deadline, DateTime? revisedDeadline)
    {
        if (updatedAt is null)
            return "Late";

        var effectiveDeadline = revisedDeadline ?? deadline;
        return updatedAt.Value <= effectiveDeadline ? "On-Time" : "Late";
    }

    private static (double OnTimeRate, double LateRate) CalculateRates(int onTime, int late)
    {
        var total = onTime + late;
        if (total == 0)
            return (0, 0);

        return (
            Math.Round((double)onTime / total * 100, 1),
            Math.Round((double)late / total * 100, 1)
        );
    }

    [Fact]
    public void CompletedBeforeDeadline_ClassifiedOnTime()
    {
        var result = ClassifyTask(
            new DateTime(2026, 7, 10, 15, 0, 0),
            new DateTime(2026, 7, 10, 17, 0, 0),
            null);
        Assert.Equal("On-Time", result);
    }

    [Fact]
    public void CompletedAfterDeadline_ClassifiedLate()
    {
        var result = ClassifyTask(
            new DateTime(2026, 7, 11, 9, 0, 0),
            new DateTime(2026, 7, 10, 17, 0, 0),
            null);
        Assert.Equal("Late", result);
    }

    [Fact]
    public void CompletedAtExactDeadline_ClassifiedOnTime()
    {
        var result = ClassifyTask(
            new DateTime(2026, 7, 10, 17, 0, 0),
            new DateTime(2026, 7, 10, 17, 0, 0),
            null);
        Assert.Equal("On-Time", result);
    }

    [Fact]
    public void CompletedBeforeRevisedDeadline_ClassifiedOnTime()
    {
        var result = ClassifyTask(
            new DateTime(2026, 7, 14, 10, 0, 0),
            new DateTime(2026, 7, 10, 17, 0, 0),
            new DateTime(2026, 7, 15, 17, 0, 0));
        Assert.Equal("On-Time", result);
    }

    [Fact]
    public void CompletedAfterRevisedDeadline_ClassifiedLate()
    {
        var result = ClassifyTask(
            new DateTime(2026, 7, 16, 10, 0, 0),
            new DateTime(2026, 7, 10, 17, 0, 0),
            new DateTime(2026, 7, 15, 17, 0, 0));
        Assert.Equal("Late", result);
    }

    [Fact]
    public void NullUpdatedAt_ClassifiedLate()
    {
        var result = ClassifyTask(null, new DateTime(2026, 7, 10), null);
        Assert.Equal("Late", result);
    }

    [Fact]
    public void AllOnTime_RateIs100Percent()
    {
        var (onTimeRate, lateRate) = CalculateRates(10, 0);
        Assert.Equal(100.0, onTimeRate);
        Assert.Equal(0.0, lateRate);
    }

    [Fact]
    public void AllLate_RateIs100PercentLate()
    {
        var (onTimeRate, lateRate) = CalculateRates(0, 10);
        Assert.Equal(0.0, onTimeRate);
        Assert.Equal(100.0, lateRate);
    }

    [Fact]
    public void HalfOnTimeHalfLate_RatesAre50PercentEach()
    {
        var (onTimeRate, lateRate) = CalculateRates(5, 5);
        Assert.Equal(50.0, onTimeRate);
        Assert.Equal(50.0, lateRate);
    }

    [Fact]
    public void ZeroCompletedTasks_RatesAreZero()
    {
        var (onTimeRate, lateRate) = CalculateRates(0, 0);
        Assert.Equal(0.0, onTimeRate);
        Assert.Equal(0.0, lateRate);
    }

    [Fact]
    public void OnTimeAndLateRates_SumTo100Percent()
    {
        for (var onTime = 0; onTime <= 10; onTime++)
        {
            var late = 10 - onTime;
            var (onTimeRate, lateRate) = CalculateRates(onTime, late);
            var sum = Math.Round(onTimeRate + lateRate, 1);
            Assert.Equal(100.0, sum);
        }
    }

    [Fact]
    public void UnevenSplit_RateRoundsToOneDecimalPlace()
    {
        var (onTimeRate, lateRate) = CalculateRates(7, 3);
        Assert.Equal(70.0, onTimeRate);
        Assert.Equal(30.0, lateRate);
    }
}
