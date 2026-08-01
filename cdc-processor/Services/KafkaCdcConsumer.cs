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
            _logger.LogInformation("No CDC topics available yet.");
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

        // Full replay strategy: assign partitions explicitly and seek to the
        // beginning each cycle. Derived insights (workload, experience, scores)
        // require the COMPLETE state (all task statuses + all assignments), which
        // cannot be computed from incremental delta events alone.
        try
        {
            var adminConfig = new AdminClientConfig { BootstrapServers = _options.BootstrapServers };
            using var adminClient = new AdminClientBuilder(adminConfig).Build();
            var metadata = adminClient.GetMetadata(TimeSpan.FromSeconds(10));

            var partitions = metadata.Topics
                .SelectMany(t => t.Partitions.Select(p => new TopicPartition(t.Topic, p.PartitionId)))
                .ToList();

            if (partitions.Count == 0)
            {
                _logger.LogInformation("No CDC topic partitions available yet.");
                return new List<CdcPayload>();
            }

            consumer.Assign(partitions);
            foreach (var tp in partitions)
            {
                consumer.Seek(new TopicPartitionOffset(tp, Offset.Beginning));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not assign Kafka partitions, falling back to subscribe: {Error}", ex.Message);
            consumer.Subscribe(topicsToRead);
        }

        var events = new List<CdcPayload>();
        var totalWait = TimeSpan.FromSeconds(30);
        var started = DateTime.UtcNow;

        try
        {
            while (DateTime.UtcNow - started < totalWait)
            {
                try
                {
                    var result = consumer.Consume(TimeSpan.FromSeconds(5));
                    if (result == null) continue;
                    if (result.IsPartitionEOF) continue;

                    var envelope = JsonSerializer.Deserialize<DebeziumEnvelope>(result.Message.Value);
                    if (envelope?.Payload != null)
                    {
                        envelope.Payload.Source ??= new CdcSource();
                        envelope.Payload.Source.Table = result.Topic;
                        events.Add(envelope.Payload);
                    }
                }
                catch (ConsumeException ex)
                {
                    if (ex.Error.IsLocalError && ex.Error.Code == ErrorCode.Local_TimedOut)
                        continue;
                    _logger.LogWarning("Consume error: {Reason}", ex.Error.Reason);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Consumer error: {Error}", ex.Message);
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
