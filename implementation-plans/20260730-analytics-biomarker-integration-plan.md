# Analytics-Biomarker Frontend Integration Plan

> **Date:** 2026-07-30
> **Goal:** Connect the BiomarkerDashboard frontend to the Analytics backend APIs, keeping the analytics feature decoupled from the core system.
> **Branch:** `frontend/feature/analytics-integration`
> **Depends on:** Backend analytics module (already implemented in `backend/`)

---

## 1. Current State Analysis

### 1.1 Frontend — `BiomarkerDashboard.tsx`

| Aspect | Current State |
|--------|---------------|
| Data source | 100% hardcoded mock data (`MOCK_VIOLATIONS`, `MOCK_SCAN`, `MOCK_NEXT_SCAN`) |
| API calls | None — no real HTTP requests |
| Scan action | Simulated 2s `setTimeout` — no real backend trigger |
| Polling | `setInterval` every 30s — only updates `lastRefresh` timestamp, no data refresh |
| Types | Custom `BiomarkerViolation` — different shape from backend `BiomarkerAlert` |
| Resilience | No fallback logic — if mock data were removed, the UI would be empty |
| Location | `frontend/src/Pages/EmergingTechAI/BiomarkerDashboard.tsx` |
| Rendering | Imported by `SystemAdmin_Dashboard.tsx:71` and rendered at `:2981` when `activeTab === 'biomarker'` |

**Key observation:** The frontend `BiomarkerViolation` type (with `type: sla_breach | workload_overload | biomarker_flag`, `employeeName`, `taskTitle`, etc.) is a **higher-level aggregated view**, whereas the backend `BiomarkerAlert` model stores individual metric-based alerts (on-time rate, overdue backlog, stuck tasks, employee workload, etc.). A **data transformation/mapping layer** is required.

### 1.2 Backend — Analytics Module (Already Implemented)

| Endpoint | Method | Returns |
|----------|--------|---------|
| `/api/analytics/biomarker/latest` | GET | `List<BiomarkerAlert>` — top 50 alerts |
| `/api/analytics/biomarker/history?from=&to=` | GET | `List<BiomarkerAlert>` — filtered alerts |
| `/api/analytics/dashboard/department/{deptId}/stream` | GET | `DepartmentStreamMetricsDTO` — real-time stream |
| `/api/analytics/dashboard/overdue?departmentId=` | GET | `List<OverdueAlertDTO>` — overdue alerts |
| `/api/analytics/dashboard/workload/stream?departmentId=` | GET | `WorkloadStreamDTO` — live workload |
| `/api/analytics/trends/chart/completion-rate?weeks=` | GET | `ChartDataDTO` — chart-ready trend data |

### 1.3 Data Shape Mismatch

**Backend `BiomarkerAlert`:**
```
Id, ScanDateTime, ScanDate, DepartmentId, DepartmentName,
MetricName, CurrentValue, ThresholdValue, Severity, Description,
IsAcknowledged, CreatedAt
```

**Frontend `BiomarkerViolation`:**
```
id, type (sla_breach|workload_overload|biomarker_flag),
severity (Critical|High|Medium|Low), description, employeeName,
employeeNumber, department, departmentId, taskTitle, taskReference,
detectedAt, status (New|Acknowledged|Resolved)
```

The frontend types are **enriched/normalized** — they contain employee context (`employeeName`, `employeeNumber`, `taskTitle`, `taskReference`) that is not present in the raw backend `BiomarkerAlert`. The service layer must:

1. Fetch raw `BiomarkerAlert` list from `/api/analytics/biomarker/latest`
2. Enrich with employee/task context from existing `api.get('/api/Task/...')` or `/api/User/...` endpoints
3. Transform to `BiomarkerViolation` shape
4. Group/classify into `sla_breach`, `workload_overload`, `biomarker_flag` by `MetricName`

---

## 2. Decoupling Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    BiomarkerDashboard (UI)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ SummaryCards │  │ ViolationsDT │  │ BiomarkerFlagSummary    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────────┘  │
│         │                 │                     │                 │
│         └────────┬────────┴──────────┬──────────┘                 │
│                  │                   │                            │
│         ┌────────┴────────┐  ┌───────┴────────┐                  │
│         │ useBiomarker()  │  │  Analytics     │                  │
│         │   custom hook   │  │  Status Badge  │                  │
│         └────────┬────────┘  └───────┬────────┘                  │
│                  │                   │                            │
└──────────────────┼───────────────────┼────────────────────────────┘
                   │                   │
          ┌────────┴───────────────────┴────────┐
          │         analyticsService.ts          │
          │  (Decoupled — optional dependency)   │
          │                                      │
          │  + fetchLatestAlerts()               │
          │  + fetchHistory(from, to)            │
          │  + checkHealth() → boolean           │
          │  + transformToViolations()           │
          │                                      │
          │  Fallback: mock data when offline    │
          └────────┬─────────────────────────────┘
                   │
          ┌────────┴──────────┐
          │  HTTP (axios)     │
          │  /api/analytics/* │
          └───────────────────┘
```

### Key Design Decisions

1. **`analyticsService.ts`** — A standalone service module. If the backend analytics module is not deployed, all methods gracefully return mock/default data. No import of this service is required by any core component (the `BiomarkerDashboard` is the sole consumer).

2. **`useBiomarker()` hook** — Encapsulates the state, polling, and data transformation. Wraps `analyticsService` calls. Tracks `analyticsStatus: 'loading' | 'online' | 'offline' | 'error'`.

3. **`AnalyticsStatusBadge`** — A small inline component rendered in the scan header area showing:
   - Green "Analytics Online" when the health check succeeds
   - Red "Analytics Offline" when the health check fails
   - Yellow "Connecting..." during initial load
   - Does NOT affect the existing layout or design tokens

4. **Core isolation** — The `BiomarkerDashboard` is already isolated (it is an optional tab in the Manager dashboard). The analytics service is only consumed by this dashboard. If the backend analytics module is removed/disabled:
   - The biomarker tab still renders
   - The UI shows "Analytics Offline" indicator
   - All data gracefully falls back to mock data
   - The "Run Scan Now" button shows a tooltip: "Analytics module unavailable"

---

## 3. Implementation Steps

### Step 1 — Create `analyticsService.ts`

**File:** `frontend/src/services/analyticsService.ts` (NEW)

**Changes:**
- Define TypeScript interfaces for backend API response types (mirroring backend DTOs)
- Create `AnalyticsService` class with methods:
  - `fetchLatestAlerts(): Promise<BiomarkerAlertDTO[]>` — calls `GET /api/analytics/biomarker/latest`
  - `fetchHistory(from, to): Promise<BiomarkerAlertDTO[]>` — calls `GET /api/analytics/biomarker/history`
  - `triggerScan(): Promise<void>` — calls `POST /api/analytics/biomarker/trigger-scan`
  - `fetchDepartmentStream(deptId): Promise<DepartmentStreamMetricsDTO>` — calls `GET /api/analytics/dashboard/department/{deptId}/stream`
  - `fetchOverdueAlerts(deptId?): Promise<OverdueAlertDTO[]>` — calls `GET /api/analytics/dashboard/overdue`
  - `fetchWorkloadStream(deptId): Promise<WorkloadStreamDTO>` — calls `GET /api/analytics/dashboard/workload/stream`
  - `fetchTrendData(weeks): Promise<ChartDataDTO>` — calls `GET /api/analytics/trends/chart/completion-rate`
  - `checkHealth(): Promise<boolean>` — probes any analytics endpoint (e.g., `/api/analytics/biomarker/latest` with short timeout)
- Each method wraps the call in try/catch:
  - On success → returns real data
  - On failure (network/5xx) → logs warning, returns null
- Mock data fallback constants (reuse existing `MOCK_VIOLATIONS`, etc.)

**Decoupling:** The service file is self-contained. It does NOT modify any existing core files. It only imports `api` from `../../api` (the existing axios wrapper).

### Step 2 — Create `useBiomarker` Hook

**File:** `frontend/src/components/Analytics/useBiomarker.ts` (NEW)

**Changes:**
- A React custom hook that wraps `analyticsService`
- State:
  - `violations: BiomarkerViolation[]`
  - `scanMeta: ScanMeta | null`
  - `scanStatus: ScanStatus`
  - `analyticsStatus: 'loading' | 'online' | 'offline' | 'error'`
  - `lastRefresh: number`
- On mount:
  1. Calls `analyticsService.checkHealth()`
  2. If online → fetches real data via `fetchLatestAlerts()` and transforms to `BiomarkerViolation[]`
  3. If offline → sets `analyticsStatus = 'offline'` and uses mock data
- Polling: every 30 seconds, re-checks health and refreshes data
- `triggerScan()`: calls `analyticsService.triggerScan()`, polls for new results
- Data transformation (`transformAlertsToViolations`):
  - Maps `BiomarkerAlert` → `BiomarkerViolation`
  - Groups by `MetricName`:
    - `OnTimeRate` / `StuckTasks` → `sla_breach`
    - `HighWorkload` → `workload_overload`
    - `OverdueBacklog` / `InactiveEmployee` / `EmployeeLateRate` → `biomarker_flag`
  - Enriches with employee name/number from alert `Description` string (parse the employee number pattern `C-XXXX`)

### Step 3 — Create `AnalyticsStatusBadge` Component

**File:** `frontend/src/components/Analytics/AnalyticsStatusBadge.tsx` (NEW)
**File:** `frontend/src/components/Analytics/AnalyticsStatusBadge.css` (NEW)

**Changes:**
- A small inline badge showing the analytics module health
- States:
  - `online` → green dot + "Analytics Live"
  - `offline` → red dot + "Analytics Offline — Using cached data"
  - `loading` → yellow pulse dot + "Connecting..."
- Uses the same design tokens as the existing `bd-live-badge` class
- Does NOT import any core components (only renders `<span>` elements with CSS classes)

### Step 4 — Refactor `BiomarkerDashboard.tsx`

**File:** `frontend/src/Pages/EmergingTechAI/BiomarkerDashboard.tsx` (MODIFY)

**Changes:**
- Replace `useState` mock data initialization with the `useBiomarker()` hook
- Replace `MOCK_SCAN`, `MOCK_VIOLATIONS`, `MOCK_NEXT_SCAN` with hook state
- Replace `handleManualScan` implementation — now calls `triggerScan()` from the hook
- Add `AnalyticsStatusBadge` in the scan header area (next to the "Biomarker Scan Engine" title or the "LIVE" badge)
- Remove hardcoded mock constants (`MOCK_SCAN`, `MOCK_VIOLATIONS`, `MOCK_NEXT_SCAN`) — move them into `analyticsService.ts` as fallbacks
- The `handleResetFilters`, `filteredViolations`, pagination, and rendering logic remain **unchanged**
- Preserve all existing CSS class names, layout structure, and styling

**Key rule:** Do NOT change the component's visual layout. Only replace data sources and add the status indicator.

### Step 5 — Add `trigger-scan` Endpoint to Backend (if missing)

**File:** `backend/Controllers/AnalyticsBiomarkerController.cs` (MODIFY)

**Changes:**
- Add a `POST /api/analytics/biomarker/trigger-scan` endpoint
- Manually invokes `BiomarkerScanService.RunBiomarkerScanAsync(DateTime.UtcNow.Date)`
- Protected by `[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]`
- This is needed so the "Run Scan Now" button on the frontend works with a real backend call

### Step 6 — Update `SystemAdmin_Dashboard` Activity Log

**File:** `frontend/src/Pages/SystemAdmin_Dashboard/SystemAdmin_Dashboard.tsx` (MODIFY)

**Changes:**
- Replace hardcoded `BIOMARKER_SCAN_LOGS` with data fetched from analytics service (optional enhancement)
- Or leave as-is since these are activity log entries, not biomarker-specific
- **Decision:** Keep hardcoded activity logs as they are presentation-only and not critical

### Step 7 — Verify Decoupling

**Verification checklist:**
- [ ] If `analyticsService.ts` throws on all calls → `BiomarkerDashboard` renders with mock data, shows offline badge
- [ ] If backend analytics controllers are removed → no compile/runtime errors in core system
- [ ] If `BiomarkerDashboard` tab is never opened → no analytics API calls are ever made
- [ ] The `AnalyticsStatusBadge` does NOT use any core component (StatusCard, DataTable, etc.)
- [ ] The `useBiomarker` hook does NOT modify any global state or context

---

## 4. API Mapping: Backend → Frontend

```
GET /api/analytics/biomarker/latest
  → analyticsService.fetchLatestAlerts()
  → useBiomarker hook transforms to BiomarkerViolation[]
  → Rendered in DataTable and SummaryCards

GET /api/analytics/biomarker/history?from=&to=
  → analyticsService.fetchHistory(from, to)
  → (Potential future use: chart/history view)

POST /api/analytics/biomarker/trigger-scan
  → analyticsService.triggerScan()
  → handleManualScan() in BiomarkerDashboard

GET /api/analytics/dashboard/department/{deptId}/stream
  → analyticsService.fetchDepartmentStream(deptId)
  → (Potential future use: real-time stream panel)

GET /api/analytics/dashboard/overdue
  → analyticsService.fetchOverdueAlerts()
  → (Future enhancement: overdue alert panel)

GET /api/analytics/trends/chart/completion-rate?weeks=4
  → analyticsService.fetchTrendData(weeks)
  → (Future enhancement: trend chart visualization)
```

---

## 5. File Change Summary

### New Files (5)

| # | File | Purpose |
|---|------|---------|
| 1 | `frontend/src/services/analyticsService.ts` | API service with mocks, health check, data transformation |
| 2 | `frontend/src/components/Analytics/useBiomarker.ts` | React hook for biomarker state, polling, health monitoring |
| 3 | `frontend/src/components/Analytics/AnalyticsStatusBadge.tsx` | Inline health status indicator |
| 4 | `frontend/src/components/Analytics/AnalyticsStatusBadge.css` | Status badge styles |
| 5 | `frontend/src/components/Analytics/index.ts` | Barrel export for analytics components |

### Modified Files (2)

| # | File | Changes |
|---|------|---------|
| 1 | `frontend/src/Pages/EmergingTechAI/BiomarkerDashboard.tsx` | Replace mock data with hook; add status badge |
| 2 | `backend/Controllers/AnalyticsBiomarkerController.cs` | Add `POST trigger-scan` endpoint (if missing) |

### No Changes To (Core Isolation)

- `frontend/src/api.ts` — No modification needed
- `frontend/src/main.tsx` — No modification needed
- `frontend/src/Pages/SystemAdmin_Dashboard/SystemAdmin_Dashboard.tsx` — No modification needed (BiomarkerDashboard is already imported as an optional tab)
- Any backend core service (`DashboardService`, `ReportService`, etc.)

---

## 6. Commit Strategy

Each step will be committed and pushed with Conventional Commit messages:

| Step | Commit Type | Message |
|------|-------------|---------|
| 1 | `feat` | `feat: create analyticsService.ts with API methods, health check, and mock fallback` |
| 2 | `feat` | `feat: create useBiomarker hook for state management, polling, and data transformation` |
| 3 | `feat` | `feat: add AnalyticsStatusBadge component for decoupled health monitoring` |
| 4 | `feat` | `feat: integrate analytics service into BiomarkerDashboard with live/offline fallback` |
| 5 | `feat` | `feat: add POST trigger-scan endpoint to AnalyticsBiomarkerController` |
| 6 | `chore` | `chore: update barrel exports and clean up mock data references` |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Backend DTO changes break frontend mapping | All mapping is in `analyticsService.ts` — single file to update |
| `BiomarkerAlert` lacks employee/task context | Enrichment via description parsing or follow-up API calls (gracefully degrades) |
| Analytics module not deployed → errors | Health check + try/catch = graceful fallback to mocks |
| "Run Scan Now" fails if backend has no trigger endpoint | Step 5 adds the endpoint; if missing, the button shows a graceful error via the offline badge |
| Performance: polling every 30s with real API | Use `checkHealth()` as a lightweight probe; only fetch full data when healthy |
