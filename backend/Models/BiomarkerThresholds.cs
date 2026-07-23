namespace Backend.Models;

public class BiomarkerThresholds
{
    public double MinOnTimeRate { get; set; } = 0.70;
    public int MaxOverdueBacklog { get; set; } = 10;
    public int MaxCompletionTimeMinutes { get; set; } = 1440;
    public double MaxLateRatePerEmployee { get; set; } = 0.50;
    public int MaxWorkloadPerEmployee { get; set; } = 10;
    public int MaxInactiveDays { get; set; } = 7;
    public int StuckTaskHours { get; set; } = 48;
}
