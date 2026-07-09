using Xunit;

namespace Backend.Tests.UserAccountManagement;

public class EmployeeNumberGenerationTests
{
    private string GenerateNextNumber(List<string> existingNumbers)
    {
        var usedNumbers = new HashSet<int>();

        foreach (var empNum in existingNumbers)
        {
            if (int.TryParse(empNum, out var num))
            {
                usedNumbers.Add(num);
            }
        }

        var nextNumber = 1;
        while (usedNumbers.Contains(nextNumber))
        {
            nextNumber++;
        }

        return nextNumber.ToString("D4");
    }

    [Fact]
    public void GenerateNextNumber_EmptyDatabase_Returns0001()
    {
        var result = GenerateNextNumber(new List<string>());
        Assert.Equal("0001", result);
    }

    [Fact]
    public void GenerateNextNumber_SequentialNumbers_ReturnsNext()
    {
        var result = GenerateNextNumber(new List<string> { "0001", "0002", "0003" });
        Assert.Equal("0004", result);
    }

    [Fact]
    public void GenerateNextNumber_WithGap_FillsGap()
    {
        var result = GenerateNextNumber(new List<string> { "0001", "0003" });
        Assert.Equal("0002", result);
    }

    [Fact]
    public void GenerateNextNumber_NonNumericValues_IgnoresThem()
    {
        var result = GenerateNextNumber(new List<string> { "0001", "TEMP", "INVALID" });
        Assert.Equal("0002", result);
    }

    [Fact]
    public void GenerateNextNumber_AlwaysFormatsWith4Digits()
    {
        var result = GenerateNextNumber(new List<string>());
        Assert.Equal(4, result.Length);
        Assert.Equal("0001", result);
    }
}