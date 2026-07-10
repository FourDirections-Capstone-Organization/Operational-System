using Xunit;

namespace Backend.Tests.Notifications;

public class EscalationRecipientTests
{
    private List<Guid> GetEscalationRecipients(
        List<Guid> assigneeIds,
        Guid? creatorId,
        List<Guid> managerIds)
    {
        var recipients = new List<Guid>();

        foreach (var assigneeId in assigneeIds)
            recipients.Add(assigneeId);

        if (creatorId.HasValue && creatorId.Value != Guid.Empty)
            recipients.Add(creatorId.Value);

        recipients.AddRange(managerIds);

        return recipients.Distinct().ToList();
    }

    [Fact]
    public void IncludesAllAssignees()
    {
        var assignees = new List<Guid> { Guid.NewGuid(), Guid.NewGuid() };
        var result = GetEscalationRecipients(assignees, null, new List<Guid>());

        Assert.Equal(2, result.Count);
        Assert.Contains(assignees[0], result);
        Assert.Contains(assignees[1], result);
    }

    [Fact]
    public void IncludesCreator()
    {
        var creatorId = Guid.NewGuid();
        var result = GetEscalationRecipients(new List<Guid>(), creatorId, new List<Guid>());

        Assert.Single(result);
        Assert.Equal(creatorId, result[0]);
    }

    [Fact]
    public void IncludesAllManagers()
    {
        var managers = new List<Guid> { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        var result = GetEscalationRecipients(new List<Guid>(), null, managers);

        Assert.Equal(3, result.Count);
    }

    [Fact]
    public void ExcludesEmptyCreatorId()
    {
        var result = GetEscalationRecipients(new List<Guid>(), Guid.Empty, new List<Guid>());

        Assert.Empty(result);
    }

    [Fact]
    public void ExcludesNullCreatorId()
    {
        var result = GetEscalationRecipients(new List<Guid>(), null, new List<Guid>());

        Assert.Empty(result);
    }

    [Fact]
    public void DeduplicatesWhenAssigneeIsAlsoCreator()
    {
        var userId = Guid.NewGuid();
        var result = GetEscalationRecipients(
            new List<Guid> { userId },
            userId,
            new List<Guid>());

        Assert.Single(result);
        Assert.Equal(userId, result[0]);
    }

    [Fact]
    public void DeduplicatesWhenCreatorIsAlsoManager()
    {
        var userId = Guid.NewGuid();
        var result = GetEscalationRecipients(
            new List<Guid>(),
            userId,
            new List<Guid> { userId });

        Assert.Single(result);
    }

    [Fact]
    public void DeduplicatesWhenAssigneeIsAlsoManager()
    {
        var userId = Guid.NewGuid();
        var result = GetEscalationRecipients(
            new List<Guid> { userId },
            null,
            new List<Guid> { userId });

        Assert.Single(result);
    }

    [Fact]
    public void FullScenario_ThreeDistinctPeople()
    {
        var assignee = Guid.NewGuid();
        var creator = Guid.NewGuid();
        var manager = Guid.NewGuid();

        var result = GetEscalationRecipients(
            new List<Guid> { assignee },
            creator,
            new List<Guid> { manager });

        Assert.Equal(3, result.Count);
        Assert.Contains(assignee, result);
        Assert.Contains(creator, result);
        Assert.Contains(manager, result);
    }

    [Fact]
    public void FullScenario_AllSamePerson_DeduplicatesToOne()
    {
        var userId = Guid.NewGuid();
        var result = GetEscalationRecipients(
            new List<Guid> { userId },
            userId,
            new List<Guid> { userId });

        Assert.Single(result);
    }
}
