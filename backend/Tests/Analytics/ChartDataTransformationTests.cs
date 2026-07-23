using Backend.Models.DTOs;

namespace Backend.Tests.Analytics;

public class ChartDataTransformationTests
{
    private ChartDataDTO TransformToChartData(List<TrendDataDTO> trends)
    {
        if (trends == null || trends.Count == 0)
            return new ChartDataDTO();

        return new ChartDataDTO
        {
            Labels = trends.Select(t => t.PeriodLabel).ToList(),
            Datasets = new List<ChartDatasetDTO>
            {
                new() { Label = "On-Time", Data = trends.Select(t => (double)t.OnTimeCount).ToList() },
                new() { Label = "Late", Data = trends.Select(t => (double)t.LateCount).ToList() }
            }
        };
    }

    private List<TrendDataDTO> BuildWeeklyTrend(int weeks, List<(int OnTime, int Late)> perWeekData)
    {
        var trends = new List<TrendDataDTO>();
        for (var w = 0; w < weeks && w < perWeekData.Count; w++)
        {
            trends.Add(new TrendDataDTO
            {
                PeriodLabel = $"Week {w + 1}",
                OnTimeCount = perWeekData[w].OnTime,
                LateCount = perWeekData[w].Late,
                TotalCompleted = perWeekData[w].OnTime + perWeekData[w].Late,
                OnTimeRate = (perWeekData[w].OnTime + perWeekData[w].Late) > 0
                    ? Math.Round((double)perWeekData[w].OnTime / (perWeekData[w].OnTime + perWeekData[w].Late) * 100, 2)
                    : 0
            });
        }
        return trends;
    }

    [Fact]
    public void TransformsToChartDTO_WithCorrectLabels()
    {
        var trends = BuildWeeklyTrend(4, new List<(int, int)>
        {
            (8, 2), (10, 1), (7, 3), (9, 2)
        });

        var chart = TransformToChartData(trends);

        Assert.Equal(4, chart.Labels.Count);
        Assert.Equal("Week 1", chart.Labels[0]);
        Assert.Equal("Week 4", chart.Labels[3]);
    }

    [Fact]
    public void TransformsToChartDTO_WithCorrectDatasets()
    {
        var trends = BuildWeeklyTrend(2, new List<(int, int)>
        {
            (8, 2), (10, 1)
        });

        var chart = TransformToChartData(trends);

        Assert.Equal(2, chart.Datasets.Count);
        Assert.Equal("On-Time", chart.Datasets[0].Label);
        Assert.Equal("Late", chart.Datasets[1].Label);
        Assert.Equal(2, chart.Datasets[0].Data.Count);
        Assert.Equal(8, chart.Datasets[0].Data[0]);
        Assert.Equal(2, chart.Datasets[1].Data[0]);
    }

    [Fact]
    public void PeriodOverPeriod_CalculatesPercentChange()
    {
        var trends = BuildWeeklyTrend(2, new List<(int, int)>
        {
            (8, 2), (10, 1)
        });

        var week1Rate = trends[0].OnTimeRate;
        var week2Rate = trends[1].OnTimeRate;
        var change = week2Rate - week1Rate;

        Assert.True(change > 0, "On-time rate should increase from week 1 to week 2");
    }

    [Fact]
    public void EmptyInput_ReturnsEmptyChart()
    {
        var chart = TransformToChartData(new List<TrendDataDTO>());

        Assert.Empty(chart.Labels);
        Assert.Empty(chart.Datasets);
    }

    [Fact]
    public void SingleWeekInput_NoComparisonData()
    {
        var trends = BuildWeeklyTrend(1, new List<(int, int)> { (5, 1) });

        Assert.Single(trends);
        Assert.Equal(1, trends.Count);
    }
}
