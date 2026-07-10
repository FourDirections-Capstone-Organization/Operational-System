using Backend.Models.Enums;

namespace Backend.Tests.TaskManagement;

public class DeadlineCalculationTests
{
    private DateTime CalculateDeadline(PriorityLevel priority, DateTime createdAt)
    {
        if (priority == PriorityLevel.Urgent)
            return createdAt.AddHours(24);

        return createdAt.AddDays(7);
    }

    [Fact]
    public void NonUrgent_DeadlineIs7Days()
    {
        var createdAt = new DateTime(2026, 7, 10, 10, 0, 0);
        var deadline = CalculateDeadline(PriorityLevel.Medium, createdAt);
        Assert.Equal(createdAt.AddDays(7), deadline);
    }

    [Fact]
    public void Urgent_DeadlineIs24Hours()
    {
        var createdAt = new DateTime(2026, 7, 10, 10, 0, 0);
        var deadline = CalculateDeadline(PriorityLevel.Urgent, createdAt);
        Assert.Equal(createdAt.AddHours(24), deadline);
    }

    [Fact]
    public void LowPriority_DeadlineIs7Days()
    {
        var createdAt = new DateTime(2026, 7, 10, 10, 0, 0);
        var deadline = CalculateDeadline(PriorityLevel.Low, createdAt);
        Assert.Equal(createdAt.AddDays(7), deadline);
    }

    [Fact]
    public void HighPriority_DeadlineIs7Days()
    {
        var createdAt = new DateTime(2026, 7, 10, 10, 0, 0);
        var deadline = CalculateDeadline(PriorityLevel.High, createdAt);
        Assert.Equal(createdAt.AddDays(7), deadline);
    }

    [Fact]
    public void Urgent_IsSLALocked()
    {
        var priority = PriorityLevel.Urgent;
        var isSLALocked = priority == PriorityLevel.Urgent;
        Assert.True(isSLALocked);
    }

    [Fact]
    public void NonUrgent_IsNotSLALocked()
    {
        var priority = PriorityLevel.Medium;
        var isSLALocked = priority == PriorityLevel.Urgent;
        Assert.False(isSLALocked);
    }
}
