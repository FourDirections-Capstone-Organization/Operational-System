using Backend.Models.Enums;
using Xunit;
using TaskStatus = Backend.Models.Enums.TaskStatus;

namespace Backend.Tests;

public class ReviewTaskTests
{
    private (bool IsValid, string? ErrorMessage, TaskStatus? NewStatus) ValidateReview(
        TaskStatus currentStatus, UserRole userRole, bool isApproved, string? remarks)
    {
        if (userRole != UserRole.Coordinator && userRole != UserRole.Manager)
            return (false, "Only Coordinators and Managers can review tasks", null);

        if (currentStatus != TaskStatus.DonePendingReview)
            return (false, "Only tasks in Done/Pending Review status can be reviewed", null);

        if (isApproved)
            return (true, null, TaskStatus.Completed);

        if (string.IsNullOrWhiteSpace(remarks))
            return (false, "Remarks are required when returning a task for rework", null);

        return (true, null, TaskStatus.InProgress);
    }

    [Fact]
    public void Coordinator_Approve_DoneTask_IsValid()
    {
        var (isValid, _, newStatus) = ValidateReview(TaskStatus.DonePendingReview, UserRole.Coordinator, true, null);
        Assert.True(isValid);
        Assert.Equal(TaskStatus.Completed, newStatus);
    }

    [Fact]
    public void Manager_Approve_DoneTask_IsValid()
    {
        var (isValid, _, newStatus) = ValidateReview(TaskStatus.DonePendingReview, UserRole.Manager, true, null);
        Assert.True(isValid);
        Assert.Equal(TaskStatus.Completed, newStatus);
    }

    [Fact]
    public void Coordinator_ReturnForRework_WithRemarks_IsValid()
    {
        var (isValid, _, newStatus) = ValidateReview(TaskStatus.DonePendingReview, UserRole.Coordinator, false, "Please fix formatting");
        Assert.True(isValid);
        Assert.Equal(TaskStatus.InProgress, newStatus);
    }

    [Fact]
    public void Coordinator_ReturnForRework_WithoutRemarks_IsInvalid()
    {
        var (isValid, error, _) = ValidateReview(TaskStatus.DonePendingReview, UserRole.Coordinator, false, "");
        Assert.False(isValid);
        Assert.Contains("Remarks are required", error);
    }

    [Fact]
    public void Encoder_Review_DoneTask_IsInvalid()
    {
        var (isValid, error, _) = ValidateReview(TaskStatus.DonePendingReview, UserRole.Encoder, true, null);
        Assert.False(isValid);
        Assert.Contains("Only Coordinators and Managers", error);
    }

    [Fact]
    public void Coordinator_Review_InProgressTask_IsInvalid()
    {
        var (isValid, error, _) = ValidateReview(TaskStatus.InProgress, UserRole.Coordinator, true, null);
        Assert.False(isValid);
        Assert.Contains("Done/Pending Review", error);
    }
}
