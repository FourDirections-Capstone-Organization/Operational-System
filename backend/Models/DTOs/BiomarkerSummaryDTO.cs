namespace Backend.Models.DTOs;

public class BiomarkerSummaryDTO
{
    public int TotalViolations { get; set; }
    public int TotalSlaBreaches { get; set; }
    public int TotalWorkloadOverloads { get; set; }
    public int TotalBiomarkerFlags { get; set; }
    public int TotalCriticalFlags { get; set; }
    public int TotalHighMediumFlags { get; set; }
    public int TotalLowFlags { get; set; }
}
