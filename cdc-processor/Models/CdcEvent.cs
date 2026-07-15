using System.Text.Json.Serialization;

namespace CdcProcessor.Models;

public class DebeziumEnvelope
{
    [JsonPropertyName("payload")]
    public CdcPayload? Payload { get; set; }
}

public class CdcPayload
{
    [JsonPropertyName("op")]
    public string Op { get; set; } = string.Empty;

    [JsonPropertyName("before")]
    public Dictionary<string, object?>? Before { get; set; }

    [JsonPropertyName("after")]
    public Dictionary<string, object?>? After { get; set; }

    [JsonPropertyName("source")]
    public CdcSource? Source { get; set; }
}

public class CdcSource
{
    [JsonPropertyName("table")]
    public string Table { get; set; } = string.Empty;

    [JsonPropertyName("db")]
    public string Db { get; set; } = string.Empty;

    [JsonPropertyName("ts_ms")]
    public long TimestampMs { get; set; }

    [JsonPropertyName("snapshot")]
    public string? Snapshot { get; set; }
}
