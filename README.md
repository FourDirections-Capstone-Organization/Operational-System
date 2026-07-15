# SpeedEx Task Allocation and Recommendation System

A full-stack operational task management system built with modern web technologies. The backend provides a RESTful API with PostgreSQL persistence and OpenAPI/Scalar documentation. The frontend is a React SPA with real-time communication via SignalR. Includes a Change Data Capture (CDC) pipeline with Neo4j for graph-based employee suitability analysis.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | ASP.NET Core 9, C# |
| **Frontend** | React 18, TypeScript, Vite 8 |
| **Operational Database** | PostgreSQL 16 |
| **Graph Database** | Neo4j (CDC & Suitability) |
| **ORM** | Entity Framework Core (Npgsql) |
| **API Documentation** | OpenAPI / Scalar |
| **Real-time** | SignalR |
| **CDC Message Broker** | Apache Kafka |
| **CDC Connector** | Debezium (PostgreSQL → Kafka) |
| **CDC Processor** | .NET 9 Worker Service |
| **Containerization** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions |
| **HTTP Client** | Axios |
| **UI Libraries** | Lucide React, Tabler Icons, Recharts |
| **PDF Export** | jsPDF, html2canvas |
| **Testing (Frontend)** | Vitest, React Testing Library |
| **Reverse Proxy** | Nginx |

## Why PostgreSQL Falls Short for Employee Recommendation

PostgreSQL, as a relational database, stores data in tables with rows and columns connected by foreign keys. For the task of finding the "most suitable employee" for a given task, PostgreSQL requires:

- Multiple JOINs across 5–6 tables (Tasks, TaskAssignments, Users, Departments, Recommendations)
- Subqueries to compute aggregate workload counts
- Window functions to rank employees by weighted criteria

This becomes increasingly slow and complex as data grows. Each suitability query requires computing JOINs, aggregations, and sorting across the entire dataset — operations that scale poorly because the cost is proportional to the total data size, not just the immediate connections.

**Neo4j** solves this by storing relationships as direct physical pointers rather than computed JOINs. A query like "find employees in this department with the lowest workload and best recommendations" is a direct graph traversal — follow a pointer from Department → Employee, check properties — not a table scan.

---

## Table of Contents

1. [PostgreSQL Implementation & Usage](#postgresql-implementation--usage)
2. [Neo4j Implementation & Usage](#neo4j-implementation--usage)
3. [Change Data Capture (CDC)](#change-data-capture-cdc)
4. [Setup Guide](#setup-guide)
5. [Team](#team)
6. [Guides](#guides)

---

## PostgreSQL Implementation & Usage

PostgreSQL is the **source of truth** for all operational data, including user accounts, tasks, assignments, departments, job positions, notifications, audit logs, and recommendations.

**Configuration** (`docker-compose.yml`):
```yaml
db:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: backend_db
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
  command:
    - "postgres"
    - "-c"
    - "wal_level=logical"          # Enables CDC via logical replication
    - "-c"
    - "max_replication_slots=5"    # Allows Debezium to create a replication slot
    - "-c"
    - "max_wal_senders=5"
```

**Key tables used by the CDC pipeline:**

| Table | Purpose | CDC Relevance |
|---|---|---|
| `Users` | Employee accounts with role, department, availability status | Tracks workload, experience, recommendations per employee |
| `Tasks` | Task lifecycle: status, priority, classification, deadlines | Determines active vs. completed tasks for workload |
| `TaskAssignments` | Junction: which employee is assigned to which task | Counts active assignments per employee |
| `Recommendations` | Coordinator feedback (Timeliness, WorkQuality, Communication) | Derives average recommendation scores |
| `Departments` | Organizational structure | Routes tasks to the correct department |

**Access via pgAdmin:** Open `http://localhost:5050` (Email: `stars@admin.com`, Password: `starslab!`), add server with Host: `db`, Database: `backend_db`, User: `postgres`.

---

## Neo4j Implementation & Usage

Neo4j is the **graph database** that stores derived employee suitability data for fast analytical queries. It is populated by the CDC Processor, not written to directly by the application.

### Graph Model

**Nodes:**

```
(:Employee {id, employeeNumber, firstName, lastName, role, availabilityStatus,
            workload, completedRoutineTasks, completedSpecialTasks,
            avgTimelinessScore, avgWorkQualityScore, avgCommunicationScore})
(:Task {id, title, status, priority, classification, deadline, createdAt})
(:Department {id, name})
```

**Relationships:**

```
(Employee)-[:BELONGS_TO]->(Department)
(Employee)-[:ASSIGNED_TO {assignedAt}]->(Task)
(Task)-[:ASSIGNED_TO_DEPT]->(Department)
```

**Configuration** (`docker-compose.yml`):
```yaml
neo4j:
  image: neo4j:latest
  ports:
    - "7474:7474"    # Neo4j Browser web UI
    - "7687:7687"    # Bolt protocol (app connection)
  environment:
    NEO4J_AUTH: neo4j/starslab!
    NEO4J_PLUGINS: '["apoc"]'
```

### Suitability Query (Cypher)

When a Coordinator or Manager assigns a task, the SuitabilityService queries Neo4j to find the best employee:

```cypher
MATCH (d:Department {id: $departmentId})
MATCH (e:Employee)-[:BELONGS_TO]->(d)
WHERE e.availabilityStatus = '0'
  AND e.role IN $eligibleRoleIds
WITH e,
     1.0 - (e.workload * 1.0 / $maxWorkload)           AS workloadFactor,
     CASE WHEN $classification = 'RoutineDailyTask'
          THEN e.completedRoutineTasks * 1.0 / $maxXP
          ELSE e.completedSpecialTasks * 1.0 / $maxXP   AS experienceFactor,
     (e.avgTimelinessScore + e.avgWorkQualityScore + e.avgCommunicationScore) / 3.0 AS recScore
RETURN e.employeeNumber, e.firstName + ' ' + e.lastName,
       e.workload,
       (0.35 * workloadFactor + 0.25 * experienceFactor + 0.40 * recScore) AS suitabilityScore
ORDER BY suitabilityScore DESC
LIMIT 5
```

**Weights:** 35% workload balance, 25% experience match, 40% recommendation score.

**Source code** — `backend/Modules/TaskManagement/SuitabilityService.cs` connects to Neo4j via the `Neo4j.Driver` NuGet package and executes this query on `GET /api/tasks/{taskId}/suitability`.

**Access:** Open `http://localhost:7474` (Username: `neo4j`, Password: `starslab!`)

---

## Change Data Capture (CDC)

### What is CDC?

Change Data Capture is a pattern that tracks row-level changes (INSERT, UPDATE, DELETE) in a database and streams those changes to other systems. Instead of the application manually emitting events, CDC listens to the database's internal transaction log (the Write-Ahead Log, or WAL) and captures every change automatically.

We chose **database-level CDC** over application-level events because:
- Zero code changes to the existing STARS backend
- Complete coverage — even direct database updates are captured
- Decoupling — the Neo4j suitability engine is independent of the operational system

### Pipeline Architecture

```
PostgreSQL ──[WAL/logical replication]──> Debezium ──[JSON events]──> Kafka ──[CDC Processor]──> Neo4j
```

### Step 1: PostgreSQL Publication

The file `postgres-init.sql` creates a publication that tells PostgreSQL to broadcast all table changes:

```sql
CREATE PUBLICATION stars_cdc FOR ALL TABLES;
```

PostgreSQL is configured with `wal_level=logical` so the WAL contains enough detail for Debezium to reconstruct before/after values.

### Step 2: Debezium Connector

Debezium runs as a Kafka Connect worker and is configured via its REST API at port 8083. It connects to PostgreSQL via a replication slot, reads the WAL, and publishes each change as a JSON message to a Kafka topic named `stars.public.{TableName}`.

**Connector configuration:**
```json
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
```

### Step 3: Kafka

Kafka acts as the message buffer between Debezium and the CDC Processor. It stores CDC events persistently so no data is lost if the processor goes offline. Topics are auto-created by Debezium as `stars.public.{TableName}`.

**Access:** Open `http://localhost:8081` (Kafka UI) to browse topics and messages.

### Step 4: CDC Processor (.NET Background Service)

The CDC Processor is a .NET 9 Worker Service that runs every 10 minutes. It:

1. Lists available Kafka topics via the AdminClient API
2. Subscribes to the configured topics and consumes all available messages
3. Deserializes each Debezium JSON event
4. Computes derived insights (workload counts, experience counts, recommendation averages)
5. Writes the derived data to Neo4j using Cypher MERGE statements

**Source code** — `cdc-processor/`:

| File | Purpose |
|---|---|
| `Program.cs` | Host builder, DI registration |
| `Workers/CdcWorker.cs` | Background loop (every 10 min) |
| `Services/KafkaCdcConsumer.cs` | Reads JSON events from Kafka |
| `Services/Neo4jDataWriter.cs` | Computes derived insights, writes to Neo4j |
| `Services/Options.cs` | Kafka and Neo4j configuration classes |
| `Models/CdcEvent.cs` | Debezium JSON model (Envelope → Payload → before/after/source) |

**CdcWorker.cs** — the orchestrator:
```csharp
public class CdcWorker : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var events = _consumer.ConsumeAllAvailable();
            if (events.Count > 0)
                await _writer.ProcessAndWriteAsync(events);
            await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken);
        }
    }
}
```

**KafkaCdcConsumer.cs** — reads events from Kafka:
```csharp
public List<CdcPayload> ConsumeAllAvailable()
{
    var availableTopics = GetAvailableTopics();
    var topicsToRead = _options.Topics
        .Where(t => availableTopics.Contains(t)).ToList();
    using var consumer = new ConsumerBuilder<string, string>(config).Build();
    consumer.Subscribe(topicsToRead);
    // Poll for up to 30 seconds, deserialize each message as DebeziumEnvelope
    var result = consumer.Consume(TimeSpan.FromSeconds(5));
    var envelope = JsonSerializer.Deserialize<DebeziumEnvelope>(result.Message.Value);
    events.Add(envelope.Payload);
}
```

**Neo4jDataWriter.cs** — transforms and writes derived data:
```csharp
public async Task ProcessAndWriteAsync(List<CdcPayload> events)
{
    var derived = CalculateDerivedInsights(events);
    // MERGE Department nodes
    // MERGE Employee nodes with derived properties (workload, scores)
    // MERGE BELONGS_TO relationships
    // MERGE Task nodes
    // MERGE ASSIGNED_TO relationships
}

private DerivedData CalculateDerivedInsights(List<CdcPayload> events)
{
    // Groups events by table (Users, Tasks, TaskAssignments, etc.)
    // Computes workload = count of active (status 0/1/2) task assignments
    // Computes experience = count of completed (status 3) tasks
    // Computes avg scores from Recommendation category counts
}
```

### Sample CDC Event (JSON)

When a task is created in PostgreSQL, Debezium publishes this to `stars.public.Tasks`:

```json
{
  "schema": { "...schema..." },
  "payload": {
    "op": "c",
    "before": null,
    "after": {
      "Id": "718337cf-...",
      "Title": "CDC Test Task",
      "Status": 0,
      "PriorityLevel": 2,
      "AssignedDepartmentId": "fd71154d-..."
    },
    "source": {
      "table": "Tasks",
      "db": "backend_db",
      "lsn": 27448424
    }
  }
}
```

### Configuration (`docker-compose.yml`)

All services are defined in `docker-compose.yml`:

```yaml
services:
  db:           # PostgreSQL 16 with wal_level=logical
  backend:      # ASP.NET Core 9 with Neo4j.Driver
  frontend:     # React 18 + Vite + Nginx
  neo4j:        # Neo4j graph database
  kafka:        # Apache Kafka (KRaft mode)
  debezium:     # Debezium PostgreSQL connector
  kafka-ui:     # Kafka web UI (port 8081)
  cdc-processor:# .NET 9 Worker (reads Kafka → writes Neo4j)
  pgadmin:      # PostgreSQL web UI (port 5050)
```

---

## Setup Guide

### Prerequisites

- Docker Desktop
- 8 GB RAM minimum (recommended: 16 GB)

### Quick Start

```powershell
# Start all services
docker compose up -d

# Check status
docker compose ps

# Trigger immediate CDC sync (after making changes)
docker compose restart cdc-processor
```

### Web UIs

| Service | URL | Credentials |
|---|---|---|
| STARS Frontend | http://localhost | — |
| STARS API / Swagger | http://localhost:5100 | — |
| pgAdmin (PostgreSQL) | http://localhost:5050 | `stars@admin.com` / `starslab!` |
| Neo4j Browser | http://localhost:7474 | `neo4j` / `starslab!` |
| Kafka UI | http://localhost:8081 | — |

### Test Accounts

| Role | Email | Password |
|---|---|---|
| Manager | `manager@stars.com` | `Manager@2024!Temp` |
| Coordinator | `coordinator2@stars.com` | `Test@2024!Pass` |
| Dispatcher | `dispatcher1@stars.com` | `Test@2024!Pass` |

### Cleanup

```powershell
# Stop containers (keep data)
docker compose down

# Full wipe (delete all data)
docker compose down -v
Remove-Item -Recurse -Force neo4j-data
```

---

## Team

| Role | Name |
|---|---|
| **Project Manager** | Vanessa Reuteras |
| **Business Analyst** | Kenneth Yulip |
| **Software Quality Assurance** | Kenneth Yulip |
| **Scrum Master** | Vanessa Reuteras |
| **Frontend Developer** | Hermione Benitez |
| **Backend Developer** | John Angelo Mikhail Reveche |
| **Integrator** | Hermione Benitez & John Angelo Mikhail Reveche |

## Guides

| Guide | Description |
|---|---|
| [Backend Guide](./guide/backend-guide.md) | Setup, Docker, API docs, and CI/CD pipeline |
| [JWT Authentication Guide](./guide/jwt-authentication-guide.md) | Auth flows, models, tokens, and production deployment |
| [CI Issue Lifecycle](./guide/ci-issue-lifecycle.md) | How CI failures create/close issues, fixing flows, and edge cases |
| [pgAdmin Usage](./guide/pgadmin-usage.md) | Connecting, querying, and managing PostgreSQL via pgAdmin 4 |
| [Centralized Auth & Integration](./guide/centralized-auth-integration.md) | Shared JWT auth, service accounts, and cross-system API integration |
