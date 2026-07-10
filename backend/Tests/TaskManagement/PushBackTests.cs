using Backend.Models.Enums;
using Xunit;
using TaskStatus = Backend.Models.Enums.TaskStatus;

namespace Backend.Tests;

public class PushBackTests
{
    private (bool IsValid, string? ErrorMessage) ValidatePushBack(
        TaskStatus currentStatus, UserRole userRole, string? comment)
    {
        if (userRole != UserRole.Coordinator)
            return (false, "Only Coordinators can push back tasks");

        if (currentStatus != TaskStatus.DonePendingReview)
            return (false, "Only tasks in Done/Pending Review status may be pushed back");

        if (string.IsNullOrWhiteSpace(comment))
            return (false, "A comment is required to push back a task");

        return (true, null);
    }

    [Fact]
    public void Coordinator_PushBack_DoneTask_WithComment_IsValid()
    {
        var (isValid, _) = ValidatePushBack(TaskStatus.DonePendingReview, UserRole.Coordinator, "Missing required fields");
        Assert.True(isValid);
    }

    [Fact]
    public void Coordinator_PushBack_WithoutComment_IsInvalid()
    {
        var (isValid, error) = ValidatePushBack(TaskStatus.DonePendingReview, UserRole.Coordinator, "");
        Assert.False(isValid);
        Assert.Contains("comment is required", error);
    }

    [Fact]
    public void Coordinator_PushBack_InProgressTask_IsInvalid()
    {
        var (isValid, error) = ValidatePushBack(TaskStatus.InProgress, UserRole.Coordinator, "Fix this");
        Assert.False(isValid);
        Assert.Contains("Done/Pending Review", error);
    }

    [Fact]
    public void Encoder_PushBack_DoneTask_IsInvalid()
    {
        var (isValid, error) = ValidatePushBack(TaskStatus.DonePendingReview, UserRole.Encoder, "Fix this");
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }

    [Fact]
    public void Manager_PushBack_DoneTask_IsInvalid()
    {
        var (isValid, error) = ValidatePushBack(TaskStatus.DonePendingReview, UserRole.Manager, "Fix this");
        Assert.False(isValid);
        Assert.Contains("Only Coordinators", error);
    }
}
