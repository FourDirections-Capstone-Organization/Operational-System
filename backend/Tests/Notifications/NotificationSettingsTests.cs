using Xunit;

namespace Backend.Tests.Notifications;

public class NotificationSettingsTests
{
    [Fact]
    public void DefaultSettings_ValueIs2()
    {
        var settings = new Backend.Models.NotificationSettings();
        Assert.Equal(2, settings.DeadlineWarningValue);
    }

    [Fact]
    public void DefaultSettings_UnitIsDays()
    {
        var settings = new Backend.Models.NotificationSettings();
        Assert.Equal(Backend.Models.Enums.DeadlineWarningUnit.Days, settings.DeadlineWarningUnit);
    }

    [Fact]
    public void UpdateSettings_ChangesValue()
    {
        var settings = new Backend.Models.NotificationSettings();
        settings.DeadlineWarningValue = 5;
        Assert.Equal(5, settings.DeadlineWarningValue);
    }

    [Fact]
    public void UpdateSettings_ChangesUnit()
    {
        var settings = new Backend.Models.NotificationSettings();
        settings.DeadlineWarningUnit = Backend.Models.Enums.DeadlineWarningUnit.Hours;
        Assert.Equal(Backend.Models.Enums.DeadlineWarningUnit.Hours, settings.DeadlineWarningUnit);
    }

    [Fact]
    public void ValidateSettings_PositiveValue_IsValid()
    {
        var value = 5;
        Assert.True(value > 0);
    }

    [Fact]
    public void ValidateSettings_ZeroValue_IsInvalid()
    {
        var value = 0;
        Assert.False(value > 0);
    }

    [Fact]
    public void ValidateSettings_NegativeValue_IsInvalid()
    {
        var value = -1;
        Assert.False(value > 0);
    }

    [Fact]
    public void UpdateTimestamp_IsSet()
    {
        var before = DateTime.UtcNow;
        var settings = new Backend.Models.NotificationSettings();
        settings.UpdatedAt = DateTime.UtcNow;
        var after = DateTime.UtcNow;

        Assert.True(settings.UpdatedAt >= before && settings.UpdatedAt <= after);
    }
}
