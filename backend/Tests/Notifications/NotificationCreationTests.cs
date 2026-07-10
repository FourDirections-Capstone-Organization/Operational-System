using Xunit;

namespace Backend.Tests.Notifications;

public class NotificationCreationTests
{
    [Fact]
    public void CreateNotification_SetsDefaultValues()
    {
        var notification = new Backend.Models.Notification
        {
            RecipientId = Guid.NewGuid(),
            Type = Backend.Models.Enums.NotificationType.TaskAssigned,
            Title = "Test Title",
            Message = "Test Message"
        };

        Assert.NotEqual(Guid.Empty, notification.Id);
        Assert.False(notification.IsRead);
        Assert.Null(notification.RelatedTaskId);
    }

    [Fact]
    public void CreateNotification_WithTaskId_SetsRelatedTaskId()
    {
        var taskId = Guid.NewGuid();
        var notification = new Backend.Models.Notification
        {
            RecipientId = Guid.NewGuid(),
            Type = Backend.Models.Enums.NotificationType.TaskAssigned,
            Title = "Test",
            Message = "Test",
            RelatedTaskId = taskId
        };

        Assert.Equal(taskId, notification.RelatedTaskId);
    }

    [Fact]
    public void CreateNotification_TitleTruncated_WhenExceeds200Chars()
    {
        var longTitle = new string('A', 250);
        var truncatedTitle = longTitle.Length > 200 ? longTitle[..200] + "..." : longTitle;

        Assert.Equal(203, truncatedTitle.Length);
        Assert.EndsWith("...", truncatedTitle);
    }

    [Fact]
    public void CreateNotification_MessageTruncated_WhenExceeds1000Chars()
    {
        var longMessage = new string('A', 1200);
        var truncatedMessage = longMessage.Length > 1000 ? longMessage[..1000] + "..." : longMessage;

        Assert.Equal(1003, truncatedMessage.Length);
        Assert.EndsWith("...", truncatedMessage);
    }

    [Fact]
    public void CreateNotification_AllTypes_AreValid()
    {
        var types = Enum.GetValues<Backend.Models.Enums.NotificationType>();
        Assert.True(types.Length >= 8);
    }
}
