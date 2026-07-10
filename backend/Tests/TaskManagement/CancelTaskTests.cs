using Backend.Models.Enums;
using Xunit;
using TaskStatus = Backend.Models.Enums.TaskStatus;

namespace Backend.Tests;

public class CancelTaskTests
{
    private (bool IsValid, string? ErrorMessage) ValidateCancel(
        TaskStatus currentStatus, UserRole userRole, string? reason, bool isConfirmed)
    {
        if (userRole != UserRole.Coordinator)
            return (false, "Only Coordinators can cancel tasks");

        if (currentStatus == TaskStatus.Completed)
            return (false, "Completed tasks cannot be cancelled");

        if (currentStatus == TaskStatus.Cancelled)
            return (false, "Task is already cancelled");

        var activeStatuses = new[] { TaskStatus.NotStarted, TaskStatus.InProgress, TaskStatus.OnHold };
        if (!activeStatuses.Contains(currentStatus))
            return (false, "Only active tasks (Not Started, In Progress, or On Hold) can be cancelled");

        if (string.IsNullOrWhiteSpace(reason))
            return (false, "Cancellation reason is required");

        if (!isConfirmed)
            return (false, "Cancellation must be confirmed");

        return (true, null);
    }

    [Fact]
    public void Coordinator_Cancel_NotStartedTask_IsValid()
    {
        var (isValid, _) = ValidateCancel(TaskStatus.NotStarted, UserRole.Coordinator, "No longer needed", true);
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_Cancel_InProgressTask_IsValid()
    {
        var (isValid, _) = ValidateCancel(TaskStatus.InProgress, UserRole.Coordinator, "Duplicate task", true);
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_Cancel_OnHoldTask_IsValid()
    {
        var (isValid, _) = ValidateCancel(TaskStatus.OnHold, UserRole.Coordinator, "Issue resolved", true);
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_Cancel_WithoutReason_IsInvalid()
    {
        var (isValid, error) = ValidateCancel(TaskStatus.InProgress, UserRole.Coordinator, "", true);
        Assert.False(isValid);
        Assert.Contains("reason is required", error);
    }

    [Fact]
    public void Coordinator_Cancel_WithoutConfirmation_IsInvalid()
    {
        var (isValid, error) = ValidateCancel(TaskStatus.InProgress, UserRole.Coordinator, "No longer needed", false);
        Assert.False(isValid);
        Assert.Contains("must be confirmed", error);
    }

    [Fact]
    public void Coordinator_Cancel_CompletedTask_IsInvalid()
    {
        var (isValid, error) = ValidateCancel(TaskStatus.Completed, UserRole.Coordinator, "Reason", true);
        Assert.False(isValid);
        Assert.Contains("Completed tasks cannot be cancelled", error);
    }

    [Fact]
    public void Coordinator_Cancel_AlreadyCancelledTask_IsInvalid()
    {
        var (isValid, error) = ValidateCancel(TaskStatus.Cancelled, UserRole.Coordinator, "Reason", true);
        Assert.False(isValid);
        Assert.Contains("already cancelled", error);
    }

    [Fact]
    public void Encoder_Cancel_Task_IsInvalid()
    {
        var (isValid, error) = ValidateCancel(TaskStatus.InProgress, UserRole.Encoder, "Reason", true);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }

    [Fact]
    public void Manager_Cancel_Task_IsInvalid()
    {
        var (isValid, error) = ValidateCancel(TaskStatus.InProgress, UserRole.Manager, "Reason", true);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }
}
