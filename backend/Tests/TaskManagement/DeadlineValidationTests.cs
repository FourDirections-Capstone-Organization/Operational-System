using Xunit;

namespace Backend.Tests;

public class DeadlineValidationTests
{
    private (bool IsValid, string? ErrorMessage) ValidateDeadline(DateTime? deadline, DateTime now)
    {
        if (!deadline.HasValue)
            return (false, "Deadline is required for non-Urgent tasks");

        if (deadline.Value <= now)
            return (false, "Deadline must be a future date/time");

        return (true, null);
    }

    [Fact]
    public void FutureDeadline_Accepted()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var future = new DateTime(2026, 8, 1, 17, 0, 0);
        var (isValid, _) = ValidateDeadline(future, now);
        Assert.True(isValid);
    }

    [Fact]
    public void PastDeadline_Rejected()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var past = new DateTime(2020, 1, 1);
        var (isValid, error) = ValidateDeadline(past, now);
        Assert.False(isValid);
        Assert.Contains("future date", error);
    }

    [Fact]
    public void ExactlyNow_Rejected()
    {
        var now = new DateTime(2026, 7, 10, 10, 0, 0);
        var (isValid, error) = ValidateDeadline(now, now);
        Assert.False(isValid);
        Assert.Contains("future date", error);
    }
}