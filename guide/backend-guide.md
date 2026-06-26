# Backend Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Installing PostgreSQL](#1-installing-postgresql)
  - [Windows](#windows)
  - [macOS (Homebrew)](#macos-homebrew)
  - [Linux (Ubuntu/Debian)](#linux-ubuntudebian)
  - [Verify Installation](#verify-installation)
- [2. Running the Backend](#2-running-the-backend)
  - [Option A — Native (no Docker)](#option-a--native-no-docker)
  - [Option B — Docker (recommended)](#option-b--docker-recommended)
   - [Pulling Updates](#pulling-updates)
   - [Docker Compose Down vs Down -v](#docker-compose-down-vs-down--v)
- [3. Accessing Scalar API Documentation](#3-accessing-scalar-api-documentation)
  - [Why Scalar?](#why-scalar)
  - [Backend Architecture](#backend-architecture)
  - [NuGet Packages Used](#nuget-packages-used)
  - [Key Design Decisions](#key-design-decisions)
- [4. CI/CD Pipeline](#4-cicd-pipeline)
  - [Triggers](#triggers)
  - [Jobs](#jobs)
  - [Workflow File](#workflow-file)
  - [How to View Pipeline Status](#how-to-view-pipeline-status)
  - [Running Tests Locally](#running-tests-locally)
- [5. Docker Details](#5-docker-details)
  - [Dockerfiles](#dockerfiles)
  - [Nginx Reverse Proxy](#nginx-reverse-proxy)
  - [docker-compose.yml](#docker-composeyml)

---

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)
- [PostgreSQL 16+](https://www.postgresql.org/download/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for containerized setup)

---

## 1. Installing PostgreSQL

### Windows

1. Go to https://www.postgresql.org/download/windows/
2. Download the **Interactive Installer** (the EDB installer)
3. Run the installer — keep all defaults
4. When prompted, set a password for the `postgres` user (default: `postgres`)
5. Leave the port as **5432**
6. Complete installation (uncheck Stack Builder at the end)

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Verify Installation

```bash
psql --version
```

---

## 2. Running the Backend

### Option A — Native (no Docker)

#### 1. Clone / navigate to the project

```bash
cd backend
```

#### 2. Ensure PostgreSQL is running

Check that the PostgreSQL service is active and listening on port 5432.

#### 3. (Optional) Create the database manually

The app will auto-create `backend_db` on first run via `EnsureCreated()`, but you can create it manually:

```bash
psql -U postgres -c "CREATE DATABASE backend_db;"
```

#### 4. Configure the connection string (if needed)

Edit `backend/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=backend_db;Username=postgres;Password=postgres"
}
```

Adjust `Username`, `Password`, `Port`, or `Host` to match your PostgreSQL setup.

#### 5. Run the application

```bash
# From the project root
dotnet run --project backend
```

The app starts on **http://localhost:5100**.

### Option B — Docker (recommended)

#### 1. Ensure Docker Desktop is running

Launch Docker Desktop from the Start Menu and wait for the whale icon in the system tray to show **"Docker Desktop is running"**.

#### 2. Start the full stack

```bash
# From the project root
docker compose up --build
```

This starts three containers:

| Container | Image | Port | Purpose |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | `5432` | Database |
| `backend` | custom (from `backend/Dockerfile`) | `5100` | ASP.NET Core API |
| `frontend` | custom (from `frontend/Dockerfile`) | `80` | React SPA via Nginx |

#### 3. Access the application

- **Frontend**: http://localhost
- **Scalar API docs**: http://localhost/scalar/v1
- **Backend API (direct)**: http://localhost:5100/api/products

#### 4. Stop the stack

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

### Pulling Updates

After someone pushes changes to GitHub and you pull them locally:

```bash
git pull
docker compose up --build
```

**What happens:**

1. `git pull` fetches the latest source code
2. `docker compose up --build` rebuilds both the backend and frontend images with the new code
3. Containers are recreated automatically with the fresh images
4. The PostgreSQL data volume (`pgdata`) is **preserved** — your database persists across updates

**Caveats:**

- **Database schema changes** — `EnsureCreated()` only creates the database if it doesn't exist. If a future update adds or changes tables, you may need to delete the volume first: `docker compose down -v && docker compose up --build`
- **Compose file changes** — If `docker-compose.yml` itself changed (new services, ports, or environment variables), running `docker compose up` (without `--build`) is sufficient after pulling — use `--build` only when application code changed.

### Docker Compose Down vs Down -v

Understanding when to use `docker compose down` vs `docker compose down -v`:

| Scenario | Command | What happens to data |
|---|---|---|
| **Pulling new code** (no schema changes) | `docker compose down` then `docker compose up --build` | Data survives ✅ |
| **Pulling schema changes** (new tables, columns, models) | `docker compose down -v` then `docker compose up --build` | **Data is lost** — fresh database created ❌ |
| **Just restarting** (no code changes) | `docker compose restart` | Fastest, no rebuild, no wipe ✅ |
| **Only `docker-compose.yml` changed** | `docker compose up` (no build) | Data survives ✅ |

**The general rule:** Always try `docker compose down` (no `-v`) first. Only use `-v` if:

1. The developer who made the changes explicitly said "schema changed, drop your DB"
2. You see EF Core errors about missing columns on startup
3. You want a completely clean slate

Since this project uses `EnsureCreated()` (not EF Core migrations), if a new model or table is added, the old database won't automatically get the new table. You would need `-v` to drop everything and let `EnsureCreated()` rebuild from scratch.

---

## 3. Accessing Scalar API Documentation

Open your browser and go to:

```
http://localhost:5100/scalar/v1
```

Or when running via Docker:

```
http://localhost/scalar/v1
```

This renders an interactive UI where you can:
- Browse all API endpoints (GET, POST, PUT, DELETE)
- View request/response schemas
- Send live requests (try it out)

### Why Scalar?

The backend uses `Scalar.AspNetCore` instead of the default Swagger UI. It's registered in `Program.cs`:

```csharp
app.MapOpenApi();                // Generates OpenAPI spec at /openapi/v1.json
app.MapScalarApiReference();     // Serves Scalar UI at /scalar/v1
```

### Backend Architecture

```
backend/
├── Controllers/
│   └── ProductsController.cs    # CRUD endpoints for Product
├── Data/
│   └── AppDbContext.cs          # EF Core DbContext (PostgreSQL)
├── Models/
│   └── Product.cs               # Product entity
├── Program.cs                   # Startup / DI / Middleware
├── appsettings.json             # Config (connection string, etc.)
├── Properties/
│   └── launchSettings.json      # Port and environment config
├── Dockerfile                   # Multi-stage .NET container build
└── Backend.csproj               # Project file with NuGet packages
```

### NuGet Packages Used

| Package | Version | Purpose |
|---|---|---|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | 9.0.3 | PostgreSQL provider for EF Core |
| `Scalar.AspNetCore` | 2.16.5 | OpenAPI / Scalar API docs UI |
| `Microsoft.AspNetCore.OpenApi` | 9.0.17 | Built-in OpenAPI document generation |

### Key Design Decisions

- **Database auto-creation**: `db.Database.EnsureCreated()` in `Program.cs` creates the `backend_db` database and `Products` table on first startup if they don't exist.
- **HTTPS redirect**: Disabled in development to avoid redirect issues when accessing Scalar UI over HTTP.
- **Port**: Configured to **5100** (HTTP) and **5101** (HTTPS) in `Properties/launchSettings.json`; container port **8080** via `ASPNETCORE_URLS`.

---

## 4. CI/CD Pipeline

The repository uses **GitHub Actions** for continuous integration. The workflow is defined in `.github/workflows/ci.yml`.

### Triggers

- **Push** to any branch
- **Pull request** targeting any branch

### Jobs

| Job | Runner | What it does |
|---|---|---|
| `backend` | `ubuntu-latest` | `dotnet restore` → `dotnet build --configuration Release` |
| `frontend` | `ubuntu-latest` | `npm ci` → `npm run build` → `npm test` |
| `docker` | `ubuntu-latest` | Build both Docker images (backend + frontend) |

### Workflow File

```yaml
name: CI

on:
  push:
    branches:
      - '**'
  pull_request:
    branches:
      - '**'

jobs:
  backend:
    name: Backend (.NET)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - name: Setup .NET 9
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 9.0.x

      - name: Restore dependencies
        run: dotnet restore

      - name: Build
        run: dotnet build --no-restore --configuration Release

  frontend:
    name: Frontend (React + Vite)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test

  docker:
    name: Docker Images
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build backend image
        uses: docker/build-push-action@v6
        with:
          context: backend
          push: false
          tags: backend:latest

      - name: Build frontend image
        uses: docker/build-push-action@v6
        with:
          context: frontend
          push: false
          tags: frontend:latest
```

### How to View Pipeline Status

1. Push your branch to GitHub
2. Go to your repository on GitHub
3. Click the **Actions** tab
4. Select the **CI** workflow to see run details
5. A green checkmark ✅ means all jobs passed

### Running Tests Locally

#### Backend (when tests are added in the future)

```bash
cd backend
dotnet test
```

#### Frontend

```bash
cd frontend
npm test
```

---

## 5. Docker Details

### Dockerfiles

**backend/Dockerfile** — Multi-stage build:
1. `build` stage: `mcr.microsoft.com/dotnet/sdk:9.0` — restores NuGet packages and publishes app
2. `runtime` stage: `mcr.microsoft.com/dotnet/aspnet:9.0` — runs the published DLL on port 8080

**frontend/Dockerfile** — Multi-stage build:
1. `build` stage: `node:22-alpine` — installs npm dependencies and builds Vite output
2. `runtime` stage: `nginx:alpine` — serves the built static files with a reverse proxy for `/api` and `/hubs`

### Nginx Reverse Proxy

The `frontend/nginx.conf` configures Nginx to:
- Serve the SPA with fallback to `index.html` for client-side routing
- Proxy `/api/*` requests to `http://backend:8080/api/`
- Proxy `/hubs/*` WebSocket requests to `http://backend:8080/hubs/` with `Upgrade` headers
- Proxy `/scalar/*` and `/openapi/*` requests to the backend for API documentation

This means the frontend container handles all traffic on port 80 and forwards API calls to the backend container internally.

### docker-compose.yml

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: backend_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      ConnectionStrings__DefaultConnection: "Host=db;Port=5432;Database=backend_db;Username=postgres;Password=postgres"
    ports:
      - "5100:8080"
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
```

Key points:
- The backend connection string uses the Docker service name `db` as the host instead of `localhost`
- PostgreSQL has a health check so the backend waits for it to be ready
- Database data persists in a named volume `pgdata`
- The `ConnectionStrings__DefaultConnection` syntax uses the double-underscore convention for overriding nested config in environment variables