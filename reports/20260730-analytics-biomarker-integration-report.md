# Analytics-Biomarker Integration & Bug Fix Report

**Date:** 2026-07-30  
**Branch:** `refactoring/bug-fix`

---

## 1. Analytics-Biomarker Frontend Integration

### What was done
Connected the BiomarkerDashboard frontend to the Analytics backend APIs. The biomarker tab (under SystemAdmin → Emerging Tech & AI) previously used 100% hardcoded mock data. Now it fetches real data from the analytics module.

### Files created

| File | Purpose |
|------|---------|
| `frontend/src/services/analyticsService.ts` | API service with health check, paginated fetch, type filter, employee/dept/date/search filters, scan trigger |
| `frontend/src/components/Analytics/useBiomarker.ts` | React hook for state management, 30s polling, data transformation (`BiomarkerAlertDTO` → `BiomarkerViolation`), employee info extraction, generation-counter stale-fetch guard |
| `frontend/src/components/Analytics/AnalyticsStatusBadge.tsx` | Inline health status indicator (green/red/amber/rose) |
| `frontend/src/components/Analytics/AnalyticsStatusBadge.css` | Status badge styles |
| `frontend/src/components/Analytics/index.ts` | Barrel exports |
| `implementation-plans/20260730-analytics-biomarker-integration-plan.md` | Original integration plan |

### Files modified

| File | Changes |
|------|---------|
| `frontend/src/Pages/EmergingTechAI/BiomarkerDashboard.tsx` | Replaced mock data with `useBiomarker` hook; added `AnalyticsStatusBadge`; wire server-side pagination + filters |
| `backend/Controllers/AnalyticsBiomarkerController.cs` | Added pagination, employee/department/date/search filter params, error logging |
| `backend/Models/BiomarkerAlert.cs` | Added `EmployeeName`, `EmployeeNumber` optional fields |
| `backend/Modules/Analytics/BiomarkerScanService.cs` | Populate employee fields on employee-level alerts |
| `backend/Models/DTOs/BiomarkerSummaryDTO.cs` | Summary counts for total violations, flags per severity |
| `backend/Program.cs` | Added `BiomarkerScanService` singleton registration |
| `backend/Migrations/20260730122432_AddBiomarkerAlertEmployeeFields.cs` | EF Core migration for new columns |

### Architecture
- **Decoupled**: Analytics service is standalone. If the backend analytics module is down, the biomarker tab shows `Analytics Offline` with empty data (no mock data fallback).
- **Server-side filtering**: Type (SLA breach, workload overload, biomarker flag), employee, department, date range, and search all sent as query params to the backend.
- **Pagination**: Server-side pagination via `PaginationQueryDTO` + `PaginatedResponseDTO`; summary counts always reflect the total dataset.

---

## 2. Session Timeout & Page Refresh Fixes

### Root Cause 1: Scroll-to-top on 30-second dashboard polling

**Symptom:** Every 15–30 seconds the Coordinator dashboard scrolled to the top of the page. Charts re-animated, data appeared to "refresh."

**Diagnosis:** Two 30-second polling intervals in `OpAdmin_Dashboard.tsx`:

1. `setInterval(() => fetchTasks(), 30000)` — called `setDashboardLoading(true)` but never set it to `false`
2. `setInterval(() => doFetchDashboard(), 30000)` — called `setDashboardLoading(true)` on every tick, replacing the entire dashboard content (charts, tables, workload summary spanning thousands of pixels) with a tiny 24px `<Loader2>` spinner. The scrollable container's content height collapsed, forcing the browser to reset scroll to 0 (top). When data arrived and content was restored, scroll stayed at the top.

**Fix (commit `e86e992`):**
- Created `doFetchDashboardSilent()` — same fetch logic but skips `setDashboardLoading(true)` entirely. Used for the 30-second polling.
- Replaced the 30-second `fetchTasks()` polling with an inline silent version that also skips `setDashboardLoading`.
- The original `doFetchDashboard()` (with loading state) is still called for initial mount and explicit filter changes.

### Root Cause 2: Full page reload on token expiry / session timeout

**Symptom:** Periodically the entire page reloaded (`window.location.href = '/'`), scrolling to the top and losing all state.

**Diagnosis:** The axios response interceptor in `main.tsx` used `window.location.href = '/'` on:
- Backend `SESSION_TIMEOUT` response (15-min inactivity)
- Missing refresh token
- Failed token refresh

This caused a full browser page reload that reset scroll position to 0.

**Fix (commit `4449120`):**
- Created `useAppNavigate.ts` — a module-level navigation bridge storing React Router's `navigate` function.
- `appNavigate(path)` performs a client-side route change (no full reload, no scroll reset).
- Registered in `SessionTimeoutWatcher` (always mounted inside `<BrowserRouter>`).
- Falls back to `window.location.href` only if the React reference isn't initialized.

### Root Cause 3: Infinite re-render loop in Notifications tab

**Symptom:** Coordinator notifications tab flips between "Loading..." and the list, making API calls in an infinite loop. Docker backend logs show rapid notification queries.

**Diagnosis:** `NOTIF_TYPE_MAP` was an inline object literal inside the component function body, creating a new reference on every render. Since `fetchAllNotifications` useCallback depended on it, the function was recreated every render → the useEffect fired every render → API call → state update → re-render → loop.

**Fix (commit `c64b018`):**
- Moved `NOTIF_TYPE_MAP` to a module-level constant (stable reference).
- Also fixed `api.get` calls that had an extra `{ params: { ... } }` wrapper causing nested serialization.

### Root Cause 4: Premature 15-min logout from duplicate frontend timer

**Symptom:** User gets logged out after ~15 minutes even while actively navigating. Multiple timer mechanisms fight each other.

**Diagnosis:** Frontend `useSessionTimeout` had its own 15-min DOM-event-based inactivity timer that raced with the backend's 15-min `LastActivityAt` API-request-based check. If a user interaction didn't trigger a tracked DOM event, the frontend timer fired and cleared tokens even while API calls were succeeding.

**Fix (commit `282eda3`):**
- Increased the frontend safety-net timer to 30 min (double the backend timeout).
- The backend `SessionTimeoutMiddleware` now always decides actual session expiry.
- The axios interceptor handles the `SESSION_TIMEOUT` redirect.

---

## 3. Other Fixes

| Issue | Fix | Commit |
|-------|-----|--------|
| `POST /api/Auth/logout` returning 404 | Added `[HttpPost("logout")]` endpoint to `AuthController` | `0d8a5c5` |
| Employee/department dropdowns missing options when filter active | Options now fetched from core API (`/api/User`, `/api/Department`) instead of derived from filtered `violations` | `bdcb613` |
| `Department` dropdown showing nothing | Fixed response parsing for `ApiResponseDTO<PaginatedResponseDTO>` wrapper | `9986924` |
| Dead code in `analyticsService.ts` | Removed 216 lines of unused DTOs, mock data, and service methods | `0ecb087` |

---

## 4. File Count Summary

| Metric | Count |
|--------|-------|
| Commits | 14 |
| Files created | 9 |
| Files modified | 16 |
| Lines added | ~550 |
| Lines removed | ~310 |
