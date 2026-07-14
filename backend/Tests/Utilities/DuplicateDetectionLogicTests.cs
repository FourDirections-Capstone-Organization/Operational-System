namespace Backend.Tests;

public class DuplicateDetectionLogicTests
{
    private const double SimilarityThreshold = 0.60;
    private const double TitleWeight = 0.60;
    private const double DescriptionWeight = 0.40;

    private double CalculateCombinedSimilarity(
        HashSet<string> inputTitle, HashSet<string> existingTitle,
        HashSet<string> inputDesc, HashSet<string> existingDesc)
    {
        var titleSim = CalculateJaccard(inputTitle, existingTitle);
        var descSim = CalculateJaccard(inputDesc, existingDesc);
        return (titleSim * TitleWeight) + (descSim * DescriptionWeight);
    }

    private double CalculateJaccard(HashSet<string> a, HashSet<string> b)
    {
        if (a.Count == 0 && b.Count == 0) return 0;
        var intersection = a.Intersect(b, StringComparer.OrdinalIgnoreCase).Count();
        var union = a.Union(b, StringComparer.OrdinalIgnoreCase).Count();
        return union == 0 ? 0 : (double)intersection / union;
    }

    [Fact]
    public void ExactMatch_HighSimilarity()
    {
        var title = new HashSet<string>(new[] { "sort", "morning", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var desc = new HashSet<string>(new[] { "daily", "sorting", "task" }, StringComparer.OrdinalIgnoreCase);

        var similarity = CalculateCombinedSimilarity(title, title, desc, desc);
        Assert.True(similarity >= SimilarityThreshold);
    }

    [Fact]
    public void SimilarTitle_ModerateSimilarity()
    {
        var inputTitle = new HashSet<string>(new[] { "sort", "morning", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var existingTitle = new HashSet<string>(new[] { "sort", "afternoon", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var inputDesc = new HashSet<string>(new[] { "daily", "task" }, StringComparer.OrdinalIgnoreCase);
        var existingDesc = new HashSet<string>(new[] { "daily", "task" }, StringComparer.OrdinalIgnoreCase);

        var similarity = CalculateCombinedSimilarity(inputTitle, existingTitle, inputDesc, existingDesc);
        Assert.True(similarity > 0.5);
    }

    [Fact]
    public void DifferentContent_LowSimilarity()
    {
        var inputTitle = new HashSet<string>(new[] { "sort", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var existingTitle = new HashSet<string>(new[] { "fix", "conveyor", "belt" }, StringComparer.OrdinalIgnoreCase);
        var inputDesc = new HashSet<string>(new[] { "sorting", "delivery" }, StringComparer.OrdinalIgnoreCase);
        var existingDesc = new HashSet<string>(new[] { "maintenance", "repair" }, StringComparer.OrdinalIgnoreCase);

        var similarity = CalculateCombinedSimilarity(inputTitle, existingTitle, inputDesc, existingDesc);
        Assert.True(similarity < SimilarityThreshold);
    }

    [Fact]
    public void TitleWeight_HigherThanDescription()
    {
        var setA = new HashSet<string>(new[] { "sort", "parcels" }, StringComparer.OrdinalIgnoreCase);
        var setB = new HashSet<string>(new[] { "fix", "conveyor" }, StringComparer.OrdinalIgnoreCase);
        var setC = new HashSet<string>(new[] { "clean", "warehouse" }, StringComparer.OrdinalIgnoreCase);

        var titleHeavy = CalculateCombinedSimilarity(setA, setA, setB, setC);
        var descHeavy = CalculateCombinedSimilarity(setB, setC, setA, setA);

        Assert.True(titleHeavy > descHeavy);
    }
}
