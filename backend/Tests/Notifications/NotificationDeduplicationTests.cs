using Xunit;

namespace Backend.Tests.Notifications;

public class NotificationDeduplicationTests
{
    private bool ShouldSendNotification(
        Guid taskId,
        int notificationType,
        List<(Guid TaskId, int Type)> existingNotifications)
    {
        return !existingNotifications.Any(n => n.TaskId == taskId && n.Type == notificationType);
    }

    [Fact]
    public void NoExistingNotification_ShouldSend()
    {
        var taskId = Guid.NewGuid();
        var existing = new List<(Guid, int)>();

        Assert.True(ShouldSendNotification(taskId, 2, existing));
    }

    [Fact]
    public void SameTaskAndType_AlreadyNotified_ShouldNotSend()
    {
        var taskId = Guid.NewGuid();
        var existing = new List<(Guid, int)> { (taskId, 2) };

        Assert.False(ShouldSendNotification(taskId, 2, existing));
    }

    [Fact]
    public void SameTask_DifferentType_ShouldSend()
    {
        var taskId = Guid.NewGuid();
        var existing = new List<(Guid, int)> { (taskId, 3) };

        Assert.True(ShouldSendNotification(taskId, 2, existing));
    }

    [Fact]
    public void DifferentTask_SameType_ShouldSend()
    {
        var taskId1 = Guid.NewGuid();
        var taskId2 = Guid.NewGuid();
        var existing = new List<(Guid, int)> { (taskId1, 2) };

        Assert.True(ShouldSendNotification(taskId2, 2, existing));
    }

    [Fact]
    public void MultipleExistingNotifications_CorrectlyDeduplicates()
    {
        var taskId1 = Guid.NewGuid();
        var taskId2 = Guid.NewGuid();
        var taskId3 = Guid.NewGuid();
        var existing = new List<(Guid, int)>
        {
            (taskId1, 2),
            (taskId1, 3),
            (taskId2, 2)
        };

        Assert.False(ShouldSendNotification(taskId1, 2, existing));
        Assert.True(ShouldSendNotification(taskId1, 4, existing));
        Assert.False(ShouldSendNotification(taskId2, 2, existing));
        Assert.True(ShouldSendNotification(taskId3, 2, existing));
    }
}
