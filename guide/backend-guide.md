# Backend Guide

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/9.0)
- [PostgreSQL 16+](https://www.postgresql.org/download/)

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

### 1. Clone / navigate to the project

```bash
cd backend
```

### 2. Ensure PostgreSQL is running

Check that the PostgreSQL service is active and listening on port 5432.

### 3. (Optional) Create the database manually

The app will auto-create `backend_db` on first run via `EnsureCreated()`, but you can create it manually:

```bash
psql -U postgres -c "CREATE DATABASE backend_db;"
```

### 4. Configure the connection string (if needed)

Edit `backend/appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=localhost;Port=5432;Database=backend_db;Username=postgres;Password=postgres"
}
```

Adjust `Username`, `Password`, `Port`, or `Host` to match your PostgreSQL setup.

### 5. Run the application

```bash
# From the project root
dotnet run --project backend
```

The app starts on **http://localhost:5100**.

---

## 3. Accessing Scalar API Documentation

Open your browser and go to:

```
http://localhost:5100/scalar/v1
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
- **Port**: Configured to **5100** (HTTP) and **5101** (HTTPS) in `Properties/launchSettings.json`.