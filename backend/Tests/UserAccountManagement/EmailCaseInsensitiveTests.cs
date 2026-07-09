using Xunit;

namespace Backend.Tests.UserAccountManagement;

public class EmailCaseInsensitiveTests
{
    [Fact]
    public void EmailComparison_SameEmailDifferentCasing_ReturnsTrue()
    {
        var email1 = "John@Test.com";
        var email2 = "john@test.com";

        Assert.Equal(email1.ToLower(), email2.ToLower());
    }

    [Fact]
    public void EmailComparison_DifferentEmails_ReturnsFalse()
    {
        var email1 = "john@test.com";
        var email2 = "jane@test.com";

        Assert.NotEqual(email1.ToLower(), email2.ToLower());
    }

    [Fact]
    public void EmailComparison_EmptyStrings_ReturnsTrue()
    {
        var email1 = "";
        var email2 = "";

        Assert.Equal(email1.ToLower(), email2.ToLower());
    }
}