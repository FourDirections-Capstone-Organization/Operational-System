namespace CdcProcessor.Workers;

using CdcProcessor.Services;
using Microsoft.Extensions.Options;

public class CdcWorker : BackgroundService
{
    private readonly KafkaCdcConsumer _consumer;
    private readonly Neo4jDataWriter _writer;
    private readonly ILogger<CdcWorker> _logger;
    private readonly int _syncIntervalMinutes;

    public CdcWorker(
        KafkaCdcConsumer consumer,
        Neo4jDataWriter writer,
        IConfiguration configuration,
        ILogger<CdcWorker> logger)
    {
        _consumer = consumer;
        _writer = writer;
        _logger = logger;
        _syncIntervalMinutes = configuration.GetValue<int>("CdcProcessor:SyncIntervalMinutes", 10);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CDC Processor started. Sync interval: {Interval} minutes", _syncIntervalMinutes);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Starting CDC sync cycle at {Time}", DateTime.UtcNow);

                var events = _consumer.ConsumeAllAvailable();

                if (events.Count > 0)
                {
                    await _writer.ProcessAndWriteAsync(events);
                    _logger.LogInformation("CDC sync cycle completed: {Count} events processed", events.Count);
                }
                else
                {
                    _logger.LogInformation("No new events to process");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during CDC sync cycle");
            }

            await Task.Delay(TimeSpan.FromMinutes(_syncIntervalMinutes), stoppingToken);
        }
    }
}
