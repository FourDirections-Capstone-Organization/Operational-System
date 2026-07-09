using Backend.Models.Enums;
using Xunit;

namespace Backend.Tests;

public class RoleDisplayInfoTests
{
    private string GetDisplayName(UserRole role) => role switch
    {
        UserRole.Manager => "Manager",
        UserRole.Coordinator => "Coordinator",
        UserRole.Dispatcher => "Dispatcher",
        UserRole.Encoder => "Encoder",
        UserRole.Courier => "Courier/Driver",
        _ => role.ToString()
    };

    private string GetDescription(UserRole role) => role switch
    {
        UserRole.Manager => "Full system access including user management and audit logs",
        UserRole.Coordinator => "Can manage tasks, view team tasks, and mark tasks as confidential",
        UserRole.Dispatcher => "Can view and update assigned tasks",
        UserRole.Encoder => "Can view and update assigned tasks",
        UserRole.Courier => "Can view and update assigned delivery tasks",
        _ => ""
    };

    [Theory]
    [InlineData(UserRole.Manager, "Manager")]
    [InlineData(UserRole.Coordinator, "Coordinator")]
    [InlineData(UserRole.Dispatcher, "Dispatcher")]
    [InlineData(UserRole.Encoder, "Encoder")]
    [InlineData(UserRole.Courier, "Courier/Driver")]
    public void GetDisplayName_ReturnsCorrectName(UserRole role, string expected)
    {
        Assert.Equal(expected, GetDisplayName(role));
    }

    [Theory]
    [InlineData(UserRole.Manager, "Full system access including user management and audit logs")]
    [InlineData(UserRole.Coordinator, "Can manage tasks, view team tasks, and mark tasks as confidential")]
    [InlineData(UserRole.Encoder, "Can view and update assigned tasks")]
    [InlineData(UserRole.Courier, "Can view and update assigned delivery tasks")]
    public void GetDescription_ReturnsCorrectDescription(UserRole role, string expected)
    {
        Assert.Equal(expected, GetDescription(role));
    }

    [Fact]
    public void Dispatcher_AndEncoder_HaveSameDescription()
    {
        Assert.Equal(GetDescription(UserRole.Dispatcher), GetDescription(UserRole.Encoder));
    }
}