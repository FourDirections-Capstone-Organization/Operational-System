namespace Backend.Models;

public class Neo4jSettings
{
    public string Uri { get; set; } = "bolt://localhost:7687";
    public string User { get; set; } = "neo4j";
    public string Password { get; set; } = "starslab!";
}
