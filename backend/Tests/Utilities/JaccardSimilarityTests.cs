namespace Backend.Tests;

public class JaccardSimilarityTests
{
    private double CalculateJaccardSimilarity(HashSet<string> setA, HashSet<string> setB)
    {
        if (setA.Count == 0 && setB.Count == 0)
            return 0;

        var intersection = setA.Intersect(setB, StringComparer.OrdinalIgnoreCase).Count();
        var union = setA.Union(setB, StringComparer.OrdinalIgnoreCase).Count();

        if (union == 0)
            return 0;

        return (double)intersection / union;
    }

    [Fact]
    public void IdenticalSets_Returns100Percent()
    {
        var setA = new HashSet<string>(new[] { "sort", "morning", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var setB = new HashSet<string>(new[] { "sort", "morning", "parcels" }, StringComparer.OrdinalIgnoreCase);

        Assert.Equal(1.0, CalculateJaccardSimilarity(setA, setB));
    }

    [Fact]
    public void DisjointSets_Returns0()
    {
        var setA = new HashSet<string>(new[] { "sort", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var setB = new HashSet<string>(new[] { "fix", "conveyor" }, StringComparer.OrdinalIgnoreCase);

        Assert.Equal(0.0, CalculateJaccardSimilarity(setA, setB));
    }

    [Fact]
    public void PartialOverlap_CalculatedCorrectly()
    {
        var setA = new HashSet<string>(new[] { "sort", "morning", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var setB = new HashSet<string>(new[] { "sort", "afternoon", "parcels" }, StringComparer.OrdinalIgnoreCase);

        var result = CalculateJaccardSimilarity(setA, setB);
        Assert.Equal(0.5, result);
    }

    [Fact]
    public void EmptySets_Returns0()
    {
        var setA = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var setB = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        Assert.Equal(0.0, CalculateJaccardSimilarity(setA, setB));
    }

    [Fact]
    public void CaseInsensitive_MatchesCorrectly()
    {
        var setA = new HashSet<string>(new[] { "SORT", "Parcels" }, StringComparer.OrdinalIgnoreCase);
        var setB = new HashSet<string>(new[] { "sort", "parcels" }, StringComparer.OrdinalIgnoreCase);

        Assert.Equal(1.0, CalculateJaccardSimilarity(setA, setB));
    }
}
