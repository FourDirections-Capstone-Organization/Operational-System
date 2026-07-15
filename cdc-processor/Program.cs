using CdcProcessor.Services;
using CdcProcessor.Workers;
using Neo4j.Driver;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.Configure<CdcProcessor.Services.KafkaOptions>(
    builder.Configuration.GetSection("Kafka"));
builder.Services.Configure<CdcProcessor.Services.Neo4jOptions>(
    builder.Configuration.GetSection("Neo4j"));

builder.Services.AddSingleton<KafkaCdcConsumer>();
builder.Services.AddSingleton<Neo4jDataWriter>();

builder.Services.AddHostedService<CdcWorker>();

var host = builder.Build();
host.Run();
