namespace Backend.Tests;

public class TextTokenizationTests
{
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "can", "shall", "it", "its", "this", "that"
    };

    private HashSet<string> TokenizeText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var words = text
            .ToLowerInvariant()
            .Split(new[] { ' ', '\t', '\n', '\r', '.', ',', ';', ':', '!', '?', '(', ')', '[', ']', '{', '}', '"', '\'' },
                StringSplitOptions.RemoveEmptyEntries)
            .Where(w => w.Length > 1 && !StopWords.Contains(w))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return words;
    }

    [Fact]
    public void StopWords_Removed()
    {
        var result = TokenizeText("the sort of parcels");
        Assert.DoesNotContain("the", result);
        Assert.DoesNotContain("of", result);
        Assert.Contains("sort", result);
        Assert.Contains("parcels", result);
    }

    [Fact]
    public void Punctuation_Stripped()
    {
        var result = TokenizeText("sort, parcels! (morning)");
        Assert.Contains("sort", result);
        Assert.Contains("parcels", result);
        Assert.Contains("morning", result);
    }

    [Fact]
    public void LowercaseNormalization()
    {
        var result = TokenizeText("SORT Morning PARCELS");
        Assert.Contains("sort", result);
        Assert.Contains("morning", result);
        Assert.Contains("parcels", result);
    }

    [Fact]
    public void SingleCharacterWords_Filtered()
    {
        var result = TokenizeText("a sort b parcels c");
        Assert.DoesNotContain("a", result);
        Assert.DoesNotContain("b", result);
        Assert.DoesNotContain("c", result);
        Assert.Contains("sort", result);
        Assert.Contains("parcels", result);
    }
}
