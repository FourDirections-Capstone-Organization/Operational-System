$json = @'
{
    "name": "stars-postgres-connector",
    "config": {
        "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
        "database.hostname": "db",
        "database.port": "5432",
        "database.user": "postgres",
        "database.password": "postgres",
        "database.dbname": "backend_db",
        "topic.prefix": "stars",
        "table.include.list": "public.*",
        "plugin.name": "pgoutput",
        "slot.name": "stars_cdc_slot",
        "publication.name": "stars_cdc"
    }
}
'@

Write-Host "Registering Debezium PostgreSQL connector..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8083/connectors" `
        -Method Post `
        -ContentType "application/json" `
        -Body $json

    Write-Host "Connector registered successfully!" -ForegroundColor Green
    Write-Host "Name: $($response.name)" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Connector already exists. Checking status..." -ForegroundColor Yellow
    }
    else {
        Write-Host "Failed to register connector: $_" -ForegroundColor Red
        exit 1
    }
}

try {
    $status = Invoke-RestMethod -Uri "http://localhost:8083/connectors/stars-postgres-connector/status"
    Write-Host "Connector status: $($status.connector.state)" -ForegroundColor Cyan
}
catch {
    Write-Host "Could not check connector status: $_" -ForegroundColor Yellow
}
