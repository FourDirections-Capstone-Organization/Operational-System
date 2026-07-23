namespace Backend.Modules.Analytics;

public class BiomarkerScanService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BiomarkerScanService> _logger;

    public BiomarkerScanService(IServiceScopeFactory scopeFactory, ILogger<BiomarkerScanService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Biomarker scan service starting");

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var nextMidnight = now.Date.AddDays(1);
            var delay = nextMidnight - now;

            if (delay > TimeSpan.Zero)
                await Task.Delay(delay, stoppingToken);

            if (stoppingToken.IsCancellationRequested)
                break;

            await RunBiomarkerScanAsync(DateTime.UtcNow.Date);
        }
    }

    private async Task RunBiomarkerScanAsync(DateTime scanDate)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<Data.AppDbContext>();

            _logger.LogInformation("Running biomarker scan for {ScanDate}", scanDate.ToString("yyyy-MM-dd"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Biomarker scan failed");
        }
    }
}
