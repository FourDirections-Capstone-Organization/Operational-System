namespace Backend.Tests.Analytics;

public class BiomarkerScanTests
{
    private (string Severity, double CurrentValue, double ThresholdValue)? CheckOnTimeRate(double onTimeRate, double minThreshold)
    {
        if (onTimeRate < minThreshold)
            return ("Warning", Math.Round(onTimeRate * 100, 2), minThreshold * 100);
        return null;
    }

    private (string Severity, int CurrentValue, int ThresholdValue)? CheckOverdueBacklog(int overdueCount, int maxThreshold)
    {
        if (overdueCount > maxThreshold)
        {
            var severity = overdueCount > maxThreshold * 2 ? "Critical" : "Warning";
            return (severity, overdueCount, maxThreshold);
        }
        return null;
    }

    private (string Severity, double CurrentValue, double ThresholdValue)? CheckEmployeeLateRate(int lateCount, int totalCompleted, double maxLateRate)
    {
        if (totalCompleted < 3) return null;
        var lateRate = (double)lateCount / totalCompleted;
        if (lateRate > maxLateRate)
            return ("Warning", Math.Round(lateRate * 100, 2), maxLateRate * 100);
        return null;
    }

    private bool CheckInactiveEmployee(int completedInLast7Days, int totalAssignments)
    {
        return completedInLast7Days == 0 && totalAssignments > 0;
    }

    private (string Severity, int CurrentValue)? CheckStuckTasks(int stuckCount)
    {
        return stuckCount > 0 ? ("Warning", stuckCount) : null;
    }

    [Fact]
    public void LowOnTimeRate_TriggersWarning()
    {
        var result = CheckOnTimeRate(0.50, 0.70);
        Assert.NotNull(result);
        Assert.Equal("Warning", result.Value.Severity);
    }

    [Fact]
    public void HighOnTimeRate_NoAlert()
    {
        var result = CheckOnTimeRate(0.90, 0.70);
        Assert.Null(result);
    }

    [Fact]
    public void OverdueBacklog_ExceedsThreshold_TriggersCritical()
    {
        var result = CheckOverdueBacklog(25, 10);
        Assert.NotNull(result);
        Assert.Equal("Critical", result.Value.Severity);
    }

    [Fact]
    public void OverdueBacklog_Moderate_TriggersWarning()
    {
        var result = CheckOverdueBacklog(15, 10);
        Assert.NotNull(result);
        Assert.Equal("Warning", result.Value.Severity);
    }

    [Fact]
    public void EmployeeLateRate_Over50Percent_TriggersWarning()
    {
        var result = CheckEmployeeLateRate(3, 5, 0.50);
        Assert.NotNull(result);
        Assert.Equal("Warning", result.Value.Severity);
    }

    [Fact]
    public void EmployeeLateRate_BelowThreshold_NoAlert()
    {
        var result = CheckEmployeeLateRate(1, 5, 0.50);
        Assert.Null(result);
    }

    [Fact]
    public void InactiveEmployee_7Days_NoCompleted_TriggersAlert()
    {
        var inactive = CheckInactiveEmployee(0, 3);
        Assert.True(inactive);
    }

    [Fact]
    public void InactiveEmployee_WithCompleted_NoAlert()
    {
        var inactive = CheckInactiveEmployee(2, 3);
        Assert.False(inactive);
    }

    [Fact]
    public void StuckTasks_Over48Hours_TriggersWarning()
    {
        var result = CheckStuckTasks(3);
        Assert.NotNull(result);
        Assert.Equal("Warning", result.Value.Severity);
    }

    [Fact]
    public void NoStuckTasks_NoAlert()
    {
        var result = CheckStuckTasks(0);
        Assert.Null(result);
    }

    [Fact]
    public void EmptyDatabase_NoAlertsGenerated()
    {
        var result = CheckOnTimeRate(0.0, 0.70);
        Assert.NotNull(result);

        var backlogResult = CheckOverdueBacklog(0, 10);
        Assert.Null(backlogResult);

        var lateResult = CheckEmployeeLateRate(0, 0, 0.50);
        Assert.Null(lateResult);
    }
}
