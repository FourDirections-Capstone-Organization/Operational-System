using Backend.Models.Enums;
using Xunit;
using TaskStatus = Backend.Models.Enums.TaskStatus;

namespace Backend.Tests;

public class OnHoldResumeTests
{
    private (bool IsValid, string? ErrorMessage) ValidatePlaceOnHold(
        TaskStatus currentStatus, UserRole userRole, string? holdReason)
    {
        if (userRole != UserRole.Coordinator)
            return (false, "Only Coordinators can place tasks on hold");

        if (currentStatus != TaskStatus.NotStarted && currentStatus != TaskStatus.InProgress)
            return (false, "Only tasks in Not Started or In Progress status can be placed on hold");

        if (string.IsNullOrWhiteSpace(holdReason))
            return (false, "Hold reason is required");

        return (true, null);
    }

    private (bool IsValid, string? ErrorMessage) ValidateResume(
        TaskStatus currentStatus, UserRole userRole, DateTime? revisedDeadline)
    {
        if (userRole != UserRole.Coordinator)
            return (false, "Only Coordinators can resume tasks");

        if (currentStatus != TaskStatus.OnHold)
            return (false, "Only tasks in On Hold status can be resumed");

        if (!revisedDeadline.HasValue || revisedDeadline.Value <= DateTime.UtcNow)
            return (false, "Revised deadline is required and must be a future date/time");

        return (true, null);
    }

    [Fact]
    public void Coordinator_Hold_NotStartedTask_IsValid()
    {
        var (isValid, _) = ValidatePlaceOnHold(TaskStatus.NotStarted, UserRole.Coordinator, "Waiting for client");
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_Hold_InProgressTask_IsValid()
    {
        var (isValid, _) = ValidatePlaceOnHold(TaskStatus.InProgress, UserRole.Coordinator, "Missing resources");
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_Hold_WithoutReason_IsInvalid()
    {
        var (isValid, error) = ValidatePlaceOnHold(TaskStatus.InProgress, UserRole.Coordinator, "");
        Assert.False(isValid);
        Assert.Contains("Hold reason is required", error);
    }

    [Fact]
    public void Coordinator_Hold_DoneTask_IsInvalid()
    {
        var (isValid, error) = ValidatePlaceOnHold(TaskStatus.DonePendingReview, UserRole.Coordinator, "Reason");
        Assert.False(isValid);
        Assert.Contains("Not Started or In Progress", error);
    }

    [Fact]
    public void Encoder_Hold_Task_IsInvalid()
    {
        var (isValid, error) = ValidatePlaceOnHold(TaskStatus.InProgress, UserRole.Encoder, "Reason");
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }

    [Fact]
    public void Coordinator_Resume_OnHoldTask_WithFutureDeadline_IsValid()
    {
        var futureDeadline = DateTime.UtcNow.AddDays(7);
        var (isValid, _) = ValidateResume(TaskStatus.OnHold, UserRole.Coordinator, futureDeadline);
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_Resume_WithoutDeadline_IsInvalid()
    {
        var (isValid, error) = ValidateResume(TaskStatus.OnHold, UserRole.Coordinator, null);
        Assert.False(isValid);
        Assert.Contains("future date/time", error);
    }

    [Fact]
    public void Coordinator_Resume_WithPastDeadline_IsInvalid()
    {
        var pastDeadline = DateTime.UtcNow.AddDays(-1);
        var (isValid, error) = ValidateResume(TaskStatus.OnHold, UserRole.Coordinator, pastDeadline);
        Assert.False(isValid);
        Assert.Contains("future date/time", error);
    }

    [Fact]
    public void Coordinator_Resume_InProgressTask_IsInvalid()
    {
        var futureDeadline = DateTime.UtcNow.AddDays(7);
        var (isValid, error) = ValidateResume(TaskStatus.InProgress, UserRole.Coordinator, futureDeadline);
        Assert.False(isValid);
        Assert.Contains("On Hold status", error);
    }

    [Fact]
    public void Encoder_Resume_Task_IsInvalid()
    {
        var futureDeadline = DateTime.UtcNow.AddDays(7);
        var (isValid, error) = ValidateResume(TaskStatus.OnHold, UserRole.Encoder, futureDeadline);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }
}
