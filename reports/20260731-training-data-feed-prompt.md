# Reusable Prompt: Feed STARS Training Data Into the System

Copy-paste the prompt below whenever you want an AI (or another machine's agent) to import the training data CSVs into the system's database. It points to the context report so the AI can skip re-discovery and avoid the known pitfalls.

---

## PROMPT

Feed the data from the `training data/` folder in the repository root into the system's database.

**START BY READING** `reports/20260731-training-data-feed-report.md` — it contains the full context, the GUID-remapping strategy, the bugs found, and the verified final state. Follow its rules exactly.

**Files to import:**
- `training data/training-users.csv` (9 users)
- `training data/training-tasks.csv` (299 tasks)
- `training data/training-assignments.csv` (439 assignments)
- `training data/training-recommendations.csv` (65 recommendations)

**Hard rules (from the report — do not deviate):**
1. The CSV GUIDs DO NOT match local DB GUIDs. Always remap CSV user GUID → local user GUID by `EmployeeNumber` (query `SELECT "EmployeeNumber", "Id" FROM "Users"` first).
2. Users already exist locally — skip all user inserts.
3. Departments referenced by the CSVs must be inserted with their CSV GUIDs (name mapping in the report) using `ON CONFLICT ("Id") DO NOTHING`.
4. Tasks: `CreatedById` = the local MGR001 GUID; **include `IsConfidential = FALSE`** (the column has no DB default and is NOT NULL); `AssignmentScope` = 1 if `has_multiple_assignments=1` else 0.
5. Wrap everything in a single `BEGIN; ... COMMIT;` transaction and pipe the SQL INTO the container:
   `Get-Content import.sql -Raw | docker compose exec -T db psql -U postgres -d backend_db --set ON_ERROR_STOP=1`
   — never connect from the host to `localhost:5432` (a local PostgreSQL service may shadow Docker's port).
6. The target database must already have tables (backend must have run migrations once).

**After the import, verify and report the final counts** (expected: 9 users, 8 departments, 306 tasks, 450 task assignments, 65 recommendations) using a single COUNT query against the container.

Clean up any generated `import.sql` file afterward.

---

## Notes for the AI

- Expected end state: `Users=9, Departments=8, Tasks=306, TaskAssignments=450, Recommendations=65`
- If psql reports an error, capture it with `2>&1 | Select-String "ERROR"` (PowerShell wraps native stderr as error records that plain string filters drop).
- If you need to re-run, it is safe: all inserts use `ON CONFLICT ("Id") DO NOTHING` and are idempotent.
