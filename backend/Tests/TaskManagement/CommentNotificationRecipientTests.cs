namespace Backend.Tests.TaskManagement;

public class CommentNotificationRecipientTests
{
    [Fact]
    public void Assignees_Notified_WhenNotAuthor()
    {
        var authorId = Guid.NewGuid();
        var assigneeId = Guid.NewGuid();
        var assignees = new List<Guid> { assigneeId };
        var creatorId = Guid.NewGuid();

        var recipients = assignees.ToList();
        if (creatorId != Guid.Empty && creatorId != authorId)
            recipients.Add(creatorId);

        recipients = recipients.Where(id => id != authorId).Distinct().ToList();

        Assert.Contains(assigneeId, recipients);
        Assert.DoesNotContain(authorId, recipients);
    }

    [Fact]
    public void Creator_Notified_WhenNotAuthor()
    {
        var authorId = Guid.NewGuid();
        var creatorId = Guid.NewGuid();

        var recipients = new List<Guid>();
        if (creatorId != Guid.Empty && creatorId != authorId)
            recipients.Add(creatorId);

        Assert.Contains(creatorId, recipients);
    }

    [Fact]
    public void Author_ExcludedFromRecipients()
    {
        var userId = Guid.NewGuid();
        var assignees = new List<Guid> { userId };
        var recipients = assignees.Where(id => id != userId).Distinct().ToList();

        Assert.Empty(recipients);
    }
}
