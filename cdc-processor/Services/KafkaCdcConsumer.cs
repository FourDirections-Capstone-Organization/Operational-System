using System.Text.Json;
using CdcProcessor.Models;
using Confluent.Kafka;
using Microsoft.Extensions.Options;

namespace CdcProcessor.Services;

public class KafkaCdcConsumer
{
    private readonly KafkaOptions _options;
    private readonly ILogger<KafkaCdcConsumer> _logger;

    public KafkaCdcConsumer(IOptions<KafkaOptions> options, ILogger<KafkaCdcConsumer> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public List<CdcPayload> ConsumeAllAvailable()
    {
        var availableTopics = GetAvailableTopics();
        var topicsToRead = _options.Topics
            .Where(t => availableTopics.Contains(t))
            .ToList();

        if (topicsToRead.Count == 0)
        {
            _logger.LogInformation("No CDC topics available yet. Waiting for Debezium snapshot.");
            return new List<CdcPayload>();
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = _options.GroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
            AllowAutoCreateTopics = false,
        };

        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        consumer.Subscribe(topicsToRead);

        var events = new List<CdcPayload>();
        var timeout = TimeSpan.FromSeconds(10);

        for (int poll = 0; poll < 12; poll++)
        {
            try
            {
                var cts = new CancellationTokenSource(timeout);
                var result = consumer.Consume(cts.Token);

                if (result.IsPartitionEOF) continue;

                try
                {
                    var envelope = JsonSerializer.Deserialize<DebeziumEnvelope>(result.Message.Value);
                    if (envelope?.Payload != null)
                    {
                        envelope.Payload.Source ??= new CdcSource();
                        envelope.Payload.Source.Table = result.Topic;
                        events.Add(envelope.Payload);
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning("Skipping malformed message on {Topic}: {Error}", result.Topic, ex.Message);
                }
            }
            catch (OperationCanceledException)
            {
                // Timeout - no message available in this poll
            }
            catch (ConsumeException ex)
            {
                _logger.LogDebug("Poll {N}: {Error}", poll, ex.Error.Reason);
            }
        }

        _logger.LogInformation("Consumed {Count} CDC events from {Topics}",
            events.Count, string.Join(", ", topicsToRead));
        return events;
    }

    private List<string> GetAvailableTopics()
    {
        var adminConfig = new AdminClientConfig { BootstrapServers = _options.BootstrapServers };
        using var adminClient = new AdminClientBuilder(adminConfig).Build();
        try
        {
            var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(10));
            return metadata.Topics
                .Select(t => t.Topic)
                .Where(t => t.StartsWith("stars.public."))
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not list Kafka topics: {Error}", ex.Message);
            return new List<string>();
        }
    }
}
