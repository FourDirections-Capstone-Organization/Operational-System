namespace Backend.Models;

public class ExpertSystemConfig
{
    public double WorkloadWeight { get; set; } = 0.35;
    public double ExperienceWeight { get; set; } = 0.25;
    public double RecScoreWeight { get; set; } = 0.40;
    public int MaxWorkload { get; set; } = 10;
    public int MaxXP { get; set; } = 20;
}
