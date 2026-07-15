namespace CdcProcessor.Services;

public class KafkaOptions
{
    public string BootstrapServers { get; set; } = "localhost:9092";
    public string GroupId { get; set; } = "stars-cdc-processor";
    public List<string> Topics { get; set; } = new();
}

public class Neo4jOptions
{
    public string Uri { get; set; } = "bolt://localhost:7687";
    public string User { get; set; } = "neo4j";
    public string Password { get; set; } = "starslab!";
}
