namespace Backend.Tests.TaskManagement;

public class RecommendationHistoryFilteringTests
{
    private List<(DateTime CreatedAt, string Notes, string Category)> FilterByDateRange(
        List<(DateTime CreatedAt, string Notes, string Category)> recommendations,
        DateTime? dateFrom, DateTime? dateTo)
    {
        var query = recommendations.AsEnumerable();

        if (dateFrom.HasValue)
            query = query.Where(r => r.CreatedAt >= dateFrom.Value);

        if (dateTo.HasValue)
            query = query.Where(r => r.CreatedAt <= dateTo.Value);

        return query.OrderByDescending(r => r.CreatedAt).ToList();
    }

    [Fact]
    public void NoFilter_ReturnsAll()
    {
        var recs = new List<(DateTime, string, string)>
        {
            (new DateTime(2026, 1, 15), "Good work", "WorkQuality"),
            (new DateTime(2026, 2, 20), "On time", "Timeliness"),
            (new DateTime(2026, 3, 10), "Well done", "WorkQuality")
        };

        var result = FilterByDateRange(recs, null, null);
        Assert.Equal(3, result.Count);
    }

    [Fact]
    public void DateFrom_FiltersCorrectly()
    {
        var recs = new List<(DateTime, string, string)>
        {
            (new DateTime(2026, 1, 15), "Jan", "WorkQuality"),
            (new DateTime(2026, 2, 20), "Feb", "Timeliness"),
            (new DateTime(2026, 3, 10), "Mar", "WorkQuality")
        };

        var result = FilterByDateRange(recs, new DateTime(2026, 2, 1), null);
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void DateTo_FiltersCorrectly()
    {
        var recs = new List<(DateTime, string, string)>
        {
            (new DateTime(2026, 1, 15), "Jan", "WorkQuality"),
            (new DateTime(2026, 2, 20), "Feb", "Timeliness"),
            (new DateTime(2026, 3, 10), "Mar", "WorkQuality")
        };

        var result = FilterByDateRange(recs, null, new DateTime(2026, 2, 28));
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void BothDateFromAndDateTo_FiltersCorrectly()
    {
        var recs = new List<(DateTime, string, string)>
        {
            (new DateTime(2026, 1, 15), "Jan", "WorkQuality"),
            (new DateTime(2026, 2, 20), "Feb", "Timeliness"),
            (new DateTime(2026, 3, 10), "Mar", "WorkQuality"),
            (new DateTime(2026, 4, 5), "Apr", "Communication")
        };

        var result = FilterByDateRange(recs, new DateTime(2026, 2, 1), new DateTime(2026, 3, 31));
        Assert.Equal(2, result.Count);
    }

    [Fact]
    public void NoMatches_ReturnsEmpty()
    {
        var recs = new List<(DateTime, string, string)>
        {
            (new DateTime(2026, 1, 15), "Jan", "WorkQuality")
        };

        var result = FilterByDateRange(recs, new DateTime(2027, 1, 1), null);
        Assert.Empty(result);
    }

    [Fact]
    public void ResultsAreNewestFirst()
    {
        var recs = new List<(DateTime, string, string)>
        {
            (new DateTime(2026, 3, 10), "Mar", "WorkQuality"),
            (new DateTime(2026, 1, 15), "Jan", "WorkQuality"),
            (new DateTime(2026, 2, 20), "Feb", "Timeliness")
        };

        var result = FilterByDateRange(recs, null, null);
        Assert.Equal(3, result.Count);
        Assert.Equal("Mar", result[0].Notes);
        Assert.Equal("Feb", result[1].Notes);
        Assert.Equal("Jan", result[2].Notes);
    }

    [Fact]
    public void EmptyHistory_ReturnsEmpty()
    {
        var result = FilterByDateRange(new List<(DateTime, string, string)>(), null, null);
        Assert.Empty(result);
    }
}
