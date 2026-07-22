## How to Run the Application via Docker

### Step 1 — Start Everything

Open PowerShell in the project root (`STARS/`) and run:

```powershell
docker compose up --build -d
```

The `--build` flag rebuilds the custom images (backend, frontend, cdc-processor). The `-d` flag runs containers in the background (detached mode).

Wait a minute or two for all services to finish starting and pass their health checks.

---

### Step 2 — Verify Everything is Up

Check that all 9 containers are running:

```powershell
docker compose ps
```

You should see all services with `Up` or `(healthy)` status:

| Container   | Expected Status |
|-------------|----------------|
| postgres    | (healthy)       |
| backend     | Up              |
| frontend    | Up              |
| neo4j       | (healthy)       |
| kafka       | (healthy)       |
| debezium    | Up              |
| kafka-ui    | Up              |
| cdc-processor | Up            |
| pgadmin     | Up              |

---

### Step 3 — Register the Debezium Connector (Required for CDC)

If you ran `docker compose down -v` before, the connector was wiped. Register it:

```powershell
& ".\register-debezium-connector.ps1"
```

Or manually:

```powershell
curl.exe -X POST http://localhost:8083/connectors -H "Content-Type: application/json" -d "@C:\Users\Khayl\AppData\Local\Temp\kilo\debezium-connector.json"
```

Verify it's running:

```powershell
curl.exe http://localhost:8083/connectors/stars-postgres-connector/status
```

---

### Step 4 — Trigger Initial Data Sync

Force the CDC Processor to read all existing data and write to Neo4j:

```powershell
docker compose restart cdc-processor
```

---

## System URLs (All Access Points)

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend (Web App)** | **`http://localhost`** | The main STARS application UI (React SPA served via Nginx) |
| **Backend API (Swagger)** | **`http://localhost:5100/swagger`** | The REST API with Swagger UI for testing endpoints |
| **Backend API (Direct)** | **`http://localhost:5100`** | The ASP.NET backend API (port 5100 maps to container port 8080) |
| **PostgreSQL (pgAdmin)** | **`http://localhost:5050`** | pgAdmin database management UI. Login with `stars@admin.com` / `starslab!`. Then add server: host=`db`, port=`5432`, user=`postgres`, password=`postgres` |
| **Neo4j Browser** | **`http://localhost:7474`** | Neo4j graph database web interface. Login with `neo4j` / `starslab!`. Run `MATCH (n) RETURN labels(n), count(*)` to see data |
| **Kafka UI** | **`http://localhost:8081`** | Kafka web interface to browse topics and messages. Click on `stars.public.Users` or `stars.public.Departments` to see CDC events |
| **Debezium API** | **`http://localhost:8083`** | Kafka Connect REST API. Use `/connectors` to list registered connectors, `/connectors/stars-postgres-connector/status` to check status |

---

## Summary Cheat Sheet

```
┌─────────────────────────────────────────────────────────────┐
│  docker compose up --build -d     ← Start everything         │
│  & ".\register-debezium-connector.ps1"  ← Register connector │
│  docker compose restart cdc-processor  ← Sync data to Neo4j  │
├─────────────────────────────────────────────────────────────┤
│  Frontend (app):   http://localhost                          │
│  Backend (API):    http://localhost:5100                     │
│  Swagger docs:     http://localhost:5100/swagger             │
│  pgAdmin (PostgreSQL): http://localhost:5050                 │
│  Neo4j Browser:    http://localhost:7474                     │
│  Kafka UI:         http://localhost:8081                     │
│  Debezium API:     http://localhost:8083                     │
└─────────────────────────────────────────────────────────────┘
```