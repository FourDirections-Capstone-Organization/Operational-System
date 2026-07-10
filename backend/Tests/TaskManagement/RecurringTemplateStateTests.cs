using Backend.Models.Enums;

namespace Backend.Tests.TaskManagement;

public class RecurringTemplateStateTests
{
    [Fact]
    public void NewTemplate_DefaultsToActive()
    {
        var template = new Backend.Models.TaskTemplate();
        Assert.True(template.IsActive);
    }

    [Fact]
    public void NewTemplate_HasGeneratedId()
    {
        var template = new Backend.Models.TaskTemplate();
        Assert.NotEqual(Guid.Empty, template.Id);
    }

    [Fact]
    public void NewTemplate_DefaultClassification_IsRoutineDailyTask()
    {
        var template = new Backend.Models.TaskTemplate();
        Assert.Equal(TaskClassification.RoutineDailyTask, template.DefaultClassification);
    }

    [Fact]
    public void NewTemplate_DefaultAssignmentScope_IsSingleEmployee()
    {
        var template = new Backend.Models.TaskTemplate();
        Assert.Equal(AssignmentScope.SingleEmployee, template.DefaultAssignmentScope);
    }

    [Fact]
    public void DeactivateTemplate_SetsIsActiveFalse()
    {
        var template = new Backend.Models.TaskTemplate();
        template.IsActive = false;
        Assert.False(template.IsActive);
    }

    [Fact]
    public void Template_UpdateLastGeneratedDate()
    {
        var template = new Backend.Models.TaskTemplate();
        var now = DateTime.UtcNow;
        template.LastGeneratedDate = now;
        Assert.Equal(now, template.LastGeneratedDate);
    }

    [Fact]
    public void Template_UpdateNextGenerationDate()
    {
        var template = new Backend.Models.TaskTemplate();
        var next = new DateTime(2026, 7, 11, 6, 0, 0);
        template.NextGenerationDate = next;
        Assert.Equal(next, template.NextGenerationDate);
    }
}
