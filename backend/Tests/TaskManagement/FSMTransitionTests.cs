using Backend.Models.Enums;
using Xunit;
using TaskStatus = Backend.Models.Enums.TaskStatus;

namespace Backend.Tests;

public class FSMTransitionTests
{
    private (bool IsValid, string? ErrorMessage) ValidateTransition(
        TaskStatus currentStatus, TaskStatus newStatus, UserRole userRole, bool isAssigned)
    {
        if (currentStatus == TaskStatus.Completed)
            return (false, "Completed tasks cannot be modified");

        if (currentStatus == TaskStatus.Cancelled)
            return (false, "Cancelled tasks cannot be modified");

        if (currentStatus == TaskStatus.OnHold)
            return (false, "On Hold tasks must be resumed before status changes");

        var allowedTransitions = new Dictionary<(TaskStatus, UserRole), TaskStatus[]>
        {
            { (TaskStatus.NotStarted, UserRole.Dispatcher), new[] { TaskStatus.InProgress } },
            { (TaskStatus.NotStarted, UserRole.Encoder), new[] { TaskStatus.InProgress } },
            { (TaskStatus.NotStarted, UserRole.Courier), new[] { TaskStatus.InProgress } },

            { (TaskStatus.InProgress, UserRole.Dispatcher), new[] { TaskStatus.DonePendingReview } },
            { (TaskStatus.InProgress, UserRole.Encoder), new[] { TaskStatus.DonePendingReview } },
            { (TaskStatus.InProgress, UserRole.Courier), new[] { TaskStatus.DonePendingReview } },

            { (TaskStatus.DonePendingReview, UserRole.Coordinator), new[] { TaskStatus.Completed } },
            { (TaskStatus.DonePendingReview, UserRole.Manager), new[] { TaskStatus.Completed } },
        };

        var key = (currentStatus, userRole);
        if (!allowedTransitions.ContainsKey(key))
            return (false, $"Invalid status transition from {currentStatus} for role {userRole}");

        var allowedNextStates = allowedTransitions[key];
        if (!allowedNextStates.Contains(newStatus))
            return (false, $"Status sequence violation - cannot transition from {currentStatus} to {newStatus}");

        if (!isAssigned && (currentStatus == TaskStatus.NotStarted || currentStatus == TaskStatus.InProgress))
            return (false, "You are not the assigned employee for this task");

        return (true, null);
    }

    [Fact]
    public void NotStarted_ToInProgress_ByAssignedEncoder_IsValid()
    {
        var (isValid, _) = ValidateTransition(TaskStatus.NotStarted, TaskStatus.InProgress, UserRole.Encoder, true);
        Assert.True(isValid);
    }

    [Fact]
    public void NotStarted_ToInProgress_ByUnassignedEncoder_IsInvalid()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.NotStarted, TaskStatus.InProgress, UserRole.Encoder, false);
        Assert.False(isValid);
        Assert.Contains("not the assigned employee", error);
    }

    [Fact]
    public void InProgress_ToDone_ByAssignedDispatcher_IsValid()
    {
        var (isValid, _) = ValidateTransition(TaskStatus.InProgress, TaskStatus.DonePendingReview, UserRole.Dispatcher, true);
        Assert.True(isValid);
    }

    [Fact]
    public void Done_ToCompleted_ByCoordinator_IsValid()
    {
        var (isValid, _) = ValidateTransition(TaskStatus.DonePendingReview, TaskStatus.Completed, UserRole.Coordinator, false);
        Assert.True(isValid);
    }

    [Fact]
    public void Done_ToCompleted_ByEncoder_IsInvalid()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.DonePendingReview, TaskStatus.Completed, UserRole.Encoder, true);
        Assert.False(isValid);
        Assert.Contains("Invalid status transition", error);
    }

    [Fact]
    public void NotStarted_ToCompleted_IsInvalid()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.NotStarted, TaskStatus.Completed, UserRole.Encoder, true);
        Assert.False(isValid);
    }

    [Fact]
    public void Completed_CannotBeModified()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.Completed, TaskStatus.InProgress, UserRole.Coordinator, false);
        Assert.False(isValid);
        Assert.Contains("Completed tasks cannot be modified", error);
    }

    [Fact]
    public void Cancelled_CannotBeModified()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.Cancelled, TaskStatus.InProgress, UserRole.Coordinator, false);
        Assert.False(isValid);
        Assert.Contains("Cancelled tasks cannot be modified", error);
    }

    [Fact]
    public void OnHold_CannotTransitionDirectly()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.OnHold, TaskStatus.InProgress, UserRole.Encoder, true);
        Assert.False(isValid);
        Assert.Contains("On Hold tasks must be resumed", error);
    }

    [Fact]
    public void NotStarted_ToOnHold_ByEncoder_IsInvalid()
    {
        var (isValid, error) = ValidateTransition(TaskStatus.NotStarted, TaskStatus.OnHold, UserRole.Encoder, true);
        Assert.False(isValid);
    }

    [Fact]
    public void Manager_CanApproveDoneTask()
    {
        var (isValid, _) = ValidateTransition(TaskStatus.DonePendingReview, TaskStatus.Completed, UserRole.Manager, false);
        Assert.True(isValid);
    }

    [Fact]
    public void Courier_CanAdvanceNotStarted()
    {
        var (isValid, _) = ValidateTransition(TaskStatus.NotStarted, TaskStatus.InProgress, UserRole.Courier, true);
        Assert.True(isValid);
    }
}
