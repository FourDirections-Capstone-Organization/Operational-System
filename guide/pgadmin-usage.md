# pgAdmin 4 Usage Guide

## Table of Contents

- [1. Connecting to the Local Database](#1-connecting-to-the-local-database)
- [2. Locating the Tables](#2-locating-the-tables)
- [3. Viewing Table Design](#3-viewing-table-design)
- [4. Dropping a Database](#4-dropping-a-database)
- [5. Running SQL Queries](#5-running-sql-queries)
- [6. Using SELECT with WHERE](#6-using-select-with-where)
- [7. Viewing the Entity Relationship Diagram (ERD)](#7-viewing-the-entity-relationship-diagram-erd)
- [8. Saving Your Work](#8-saving-your-work)
- [9. Tips & Troubleshooting](#9-tips--troubleshooting)

---

## 1. Connecting to the Local Database

### Step 1: Open pgAdmin 4

pgAdmin 4 runs as a web app in your browser. It is typically installed with PostgreSQL and can be launched from:

- **Start Menu** → Search "pgAdmin 4"
- Or visit `http://localhost:5432/browser/` (if running as a service)

### Step 2: Register the Server

If this is your first time, no servers will be listed. You need to add one:

1. In the left sidebar, right-click **Servers** → **Register** → **Server...**
2. Fill in the tabs:

**General tab:**
- **Name:** `Local PostgreSQL` (or any name you prefer)

**Connection tab:**
| Field | Value |
|---|---|
| Host name / address | `localhost` |
| Port | `5432` |
| Maintenance database | `postgres` |
| Username | `postgres` |
| Password | `postgres` |

3. Click **Save**. pgAdmin will store the password (you can check "Save password").

### Step 3: Confirm Connection

Once saved, expand **Servers** → **Local PostgreSQL** → **Databases**. You should see `backend_db` listed (it is created automatically when the backend starts).

> **Note:** If `backend_db` does not appear, run the backend first:
> ```powershell
> dotnet run --project backend
> ```
> Or if using Docker:
> ```powershell
> docker compose up --build
> ```

---

## 2. Locating the Tables

To find your database tables, expand the tree in this order:

```
Servers
 └─ Local PostgreSQL (or your server name)
     └─ Databases
         └─ backend_db
             └─ Schemas
                 └─ public
                     └─ Tables
                         ├─ Accounts
                         ├─ Employees
                         ├─ Products
                         └─ RefreshTokens
```

Each table name is a node you can expand to see its **Columns**, **Constraints**, **Indexes**, and more.

---

## 3. Viewing Table Design

To see the structure of a table (columns, types, keys, indexes):

1. Expand **Tables** → right-click a table (e.g., `Employees`)
2. Click **Properties**
3. Browse the tabs:

| Tab | What it shows |
|---|---|
| **Columns** | Column name, data type, length, nullable, default value |
| **Constraints** | Primary keys, foreign keys, unique constraints, check constraints |
| **Indexes** | Indexed columns (e.g., unique index on `Email`) |
| **Rules** | Any custom rules (usually empty) |
| **Triggers** | Any triggers (usually empty) |

**Quick view:** You can also just expand the table node itself — it shows columns directly without opening Properties.

---

## 4. Dropping a Database

Sometimes you need to drop the entire database (e.g., when schema changes require a fresh start).

### Step 1: Disconnect First

You cannot drop a database while you are connected to it.

1. Right-click **backend_db** → **Disconnect Database**
2. The icon will change to show it is disconnected

### Step 2: Drop the Database

1. Right-click **backend_db** (still in the tree) → **Delete/Drop**
2. Confirm the dialog: **Yes**
3. The database is now deleted

### Step 3: Let the Backend Recreate It

Since the database is already dropped, you just need to restart the backend so `EnsureCreated()` runs. Pick the option that matches how you run the app:

#### If using Docker

```powershell
docker compose down && docker compose up --build
```

**No `-v` needed.** The database is already gone — `-v` would delete the entire Docker volume unnecessarily.

#### If running natively (dotnet run)

```powershell
dotnet run --project backend
```

#### What happens

The backend starts, detects the database is missing, and recreates it with all tables via `EnsureCreated()`. You will see no errors — just the usual startup logs.

> **⚠️ This permanently deletes all data.** Only do this if you are okay losing all records.

---

## 5. Running SQL Queries

### Opening the Query Tool

1. Right-click **backend_db** (must be connected)
2. Click **Query Tool**
3. A new editor panel opens on the right side

### Writing and Running Queries

- Type your SQL in the editor
- Press **F5** to run the entire query
- Select specific lines and press **F5** to run only those
- Results appear in the **Data Output** panel below

### Example: View all employees

```sql
SELECT * FROM "Employees";
```

**Important:** PostgreSQL is case-sensitive for identifiers. Always use double quotes around table and column names if they were created with mixed case (which they are by EF Core).

### Example: View accounts with their employee

```sql
SELECT * FROM "Accounts"
JOIN "Employees" ON "Accounts"."EmployeeId" = "Employees"."Id";
```

---

## 6. Using SELECT with WHERE

Filtering data is done with the `WHERE` clause.

### Basic WHERE

```sql
SELECT "FirstName", "LastName", "Email"
FROM "Employees"
WHERE "Email" = 'john@speedex.com';
```

### Multiple Conditions (AND)

```sql
SELECT * FROM "Employees"
WHERE "FirstName" = 'John'
  AND "LastName" = 'Doe';
```

### Multiple Conditions (OR)

```sql
SELECT * FROM "Employees"
WHERE "Role" = 'SystemAdmin'
   OR "Role" = 'Employee';
```

> Wait — `Role` is on the `Accounts` table, not `Employees`. You need a JOIN:

```sql
SELECT "Employees"."FirstName", "Employees"."LastName", "Accounts"."Role"
FROM "Employees"
JOIN "Accounts" ON "Employees"."Id" = "Accounts"."EmployeeId"
WHERE "Accounts"."Role" = 'SystemAdmin'
   OR "Accounts"."Role" = 'Employee';
```

### Pattern Matching (LIKE)

```sql
SELECT * FROM "Employees"
WHERE "Email" LIKE '%@speedex.com';
```

### Checking for NULL

```sql
SELECT * FROM "Employees"
WHERE "MiddleName" IS NULL;
```

### Date Filtering

```sql
SELECT * FROM "Employees"
WHERE "CreatedAt" >= '2026-01-01';
```

---

## 7. Viewing the Entity Relationship Diagram (ERD)

pgAdmin can generate a visual diagram of all tables and their relationships.

### Method 1: For the entire database

1. Right-click **backend_db** → **Generate ERD (Beta)**
2. A new tab opens showing all tables as boxes with columns
3. Foreign key relationships are drawn as connecting lines

### Method 2: For a specific schema

1. Right-click **Schemas** → **ERD for database**
2. Select the schema (usually `public`)
3. Click **Generate**

### Using the ERD

- Drag tables to rearrange the layout
- Click a table to highlight its connections
- Export as an image: ERD toolbar → **Save as image** (floppy disk or camera icon)

---

## 8. Saving Your Work

### Saving a Query

1. In the **Query Tool**, click the **Save** icon (floppy disk) or press **Ctrl+S**
2. Give your query a name (e.g., `get-all-employees.sql`)
3. It is saved in pgAdmin's internal storage — you can reopen it later from the **Saved Query** tree

### Exporting Query Results

After running a query:

1. In the **Data Output** panel, click the **Download as CSV** icon (floppy disk with a down arrow)
2. Choose a location on your computer
3. The file will contain the result rows in CSV format

### Exporting as Text / Copying

- Select cells in the results → **Ctrl+C** to copy
- Or right-click results → **Copy** (with or without headers)

### Saving the Server Connection

The server registration is saved automatically. You do not need to re-register every time you open pgAdmin.

---

## 9. Tips & Troubleshooting

| Problem | Solution |
|---|---|
| `relation "employees" does not exist` | PostgreSQL lowercases unquoted identifiers. Use `"Employees"` with double quotes. |
| `Cannot drop database while connected` | Right-click the database → **Disconnect Database**, then drop it |
| `Database "backend_db" does not appear` | Refresh: right-click **Databases** → **Refresh**. If still missing, start the backend first. |
| `Connection refused` | Ensure PostgreSQL service is running. If using Docker, check `docker ps` for the `postgres` container. |
| `Table not found` | Run the backend first to trigger `EnsureCreated()`. Tables are only created on backend startup. |
| `Can't find the Query Tool` | Right-click your database (not the server) → **Query Tool** |
| `How do I see all databases?` | Expand **Databases** under your server node. You may see `postgres` (default) and `backend_db`. |
| `Forgot the password?` | For local Docker: username `postgres`, password `postgres`. For native install: whatever you set during installation. |
