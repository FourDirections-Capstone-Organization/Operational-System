# Pagination Optimization — AI/ML + Task List Implementation Plan

## Background

Two areas need pagination optimization:

### AI/ML Endpoints
The AI/ML backend has **no pagination** across any of its endpoints. The suitability endpoint is the only one that returns a list (`List<SuitabilityResponseDTO>`), but it's hard-coded to `LIMIT 5` in the Neo4j Cypher query with no way for the frontend to request more or page through results.

### Task List (Frontend Bypasses Backend Pagination)
The backend task list endpoint (`GET /api/Task`) **already has full server-side pagination** — it accepts `pageNumber`/`pageSize`, applies `Skip/Take`, and returns `PaginatedResponseDTO<TaskResponseDTO>` with metadata. However, the frontend **bypasses it entirely**:

| Layer | Pagination? | What it does |
|---|---|---|
| Backend `TaskController.GetAllAsync` | ✅ Full | Returns `PaginatedResponseDTO` with Skip/Take |
| Backend `PaginatedResponseDTO<T>` | ✅ Full | Items, TotalCount, PageNumber, PageSize, TotalPages |
| Frontend `OpAdmin_Dashboard.tsx` | ❌ **Hardcoded** | Fetches `pageNumber=1&pageSize=200` — grabs all tasks at once |
| Frontend `TaskManager.tsx` | ⚠️ **Client-only** | Local `page` state using `slice()` — 8 items/page, ignores server pagination |
| Frontend `DataTable.tsx` | ✅ **Has controls** | Full pagination UI built-in (numbered buttons, page jump, size selector) but fed client-side data |

**The disconnect:** The `DataTable` component has complete pagination controls ready to use. But `OpAdmin_Dashboard.tsx` fetches 200 records at once, and `TaskManager.tsx` does client-side `slice()` pagination with 8 items per page. The backend's paginated response is completely ignored.

### Endpoints Audit Summary

| Endpoint | Returns | Pagination? | Action Needed |
|----------|---------|-------------|---------------|
| `GET /api/tasks/{taskId}/suitability` | `List<SuitabilityResponseDTO>` (max 5) | **None** — hard-coded `LIMIT 5` | ✅ Add pagination |
| `GET .../suitability/{empId}/explain` | `List<SuitabilityExplanationDTO>` (1 item) | Not applicable | ❌ No change needed |
| `GET /api/tasks/{taskId}/sla-risk` | Single `SlaRiskResponseDTO` | Not applicable | ❌ No change needed |
| `GET .../sla-risk/explain` | Single `SlaRiskExplanationDTO` | Not applicable | ❌ No change needed |
| `POST /api/admin/ml/retrain` | Action trigger | Not applicable | ❌ No change needed |

---

## Task 1 — Add Paginated Response Wrapper

**Files:** `backend/Models/DTOs/PagedResponseDTO.cs` (NEW)

Create a reusable paginated response DTO that all paginated endpoints can use:

```csharp
namespace Backend.Models.DTOs;

public class PagedResponseDTO<T>
{
    public List<T> Items { get; set; } = new();
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / Math.Max(PageSize, 1));
}
```

---

## Task 2 — Add Pagination to Suitability Endpoint

### 2.1 Update Interface

**File:** `backend/Modules/TaskManagement/ISuitabilityService.cs` (MODIFY)

Add a new overload or modify the existing method to accept pagination parameters:

```csharp
Task<ApiResponseDTO<PagedResponseDTO<SuitabilityResponseDTO>>> GetSuitableEmployeesPagedAsync(
    Guid taskId, UserRole callerRole, Guid callerDepartmentId,
    int pageNumber = 1, int pageSize = 5);
```

(Keep the existing `GetSuitableEmployeesAsync` as-is for backward compatibility, or have it delegate to the paged version with default params.)

### 2.2 Update Service Implementation

**File:** `backend/Modules/TaskManagement/SuitabilityService.cs` (MODIFY)

- Modify the Neo4j Cypher query to accept dynamic `$skip` and `$limit` parameters instead of the hard-coded `LIMIT 5`
- Add a separate count query to get the total eligible employees before pagination
- Return `PagedResponseDTO<SuitabilityResponseDTO>` instead of `List<SuitabilityResponseDTO>`

```csharp
// Cypher query changes:
// Before:  RETURN ... ORDER BY suitabilityScore DESC LIMIT 5
// After:   RETURN ... ORDER BY suitabilityScore DESC SKIP $skip LIMIT $limit
// + separate count query: RETURN count(e) AS totalCount
```

### 2.3 Add Pagination Params to Controller

**File:** `backend/Controllers/SuitabilityController.cs` (MODIFY)

Modify the `GetSuitableEmployees` endpoint to accept optional query parameters:

```csharp
[HttpGet("tasks/{taskId:guid}/suitability")]
public async Task<IActionResult> GetSuitableEmployees(
    Guid taskId,
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 5)
```

(This is backward-compatible — existing callers that don't pass pagination params will default to `pageNumber=1, pageSize=5`, which matches the current behavior of returning the top 5.)

---

## Task 3 — Update Frontend API Service

**File:** `frontend/src/services/aiService.ts` (MODIFY)

- Update the `getSuitability` method to accept optional pagination params
- Add the `PagedResponseDTO` TypeScript interface

```typescript
export interface PagedResponseDTO<T> {
    items: T[];
    pageNumber: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export const aiService = {
    getSuitability: (taskId: string, pageNumber?: number, pageSize?: number) => {
        const params: Record<string, any> = {};
        if (pageNumber !== undefined) params.pageNumber = pageNumber;
        if (pageSize !== undefined) params.pageSize = pageSize;
        return api.get<ApiResponse<PagedResponseDTO<SuitabilityResponseDTO>>>(
            `/api/tasks/${taskId}/suitability`, params);
    },
    // ... other methods unchanged
};
```

---

## Task 4 — Add Pagination UI to AiRecommendationPanel

**File:** `frontend/src/components/AiRecommendationPanel/AiRecommendationPanel.tsx` (MODIFY)

- Add pagination state: `pageNumber`, `totalCount`, `totalPages`
- Update the `fetchData` callback to pass `pageNumber` to `aiService.getSuitability()`
- Add pagination controls at the bottom of the suitability list:

```tsx
// State
const [pageNumber, setPageNumber] = useState(1);
const [totalCount, setTotalCount] = useState(0);
const pageSize = 5;

// Fetch with pagination
const res = await aiService.getSuitability(taskId, pageNumber, pageSize);
// ... setSuitability(res.data.data.items)
// ... setTotalCount(res.data.data.totalCount)

// Pagination controls (shown when totalCount > pageSize)
{totalCount > pageSize && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
        <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)}>
            Previous
        </button>
        <span>Page {pageNumber} of {Math.ceil(totalCount / pageSize)}</span>
        <button disabled={pageNumber >= Math.ceil(totalCount / pageSize)} onClick={() => setPageNumber(p => p + 1)}>
            Next
        </button>
    </div>
)}
```

---

## Task 5 — Remove Hard-coded LIMIT 5 from Cypher (Optional Enhancement)

**File:** `backend/Modules/TaskManagement/SuitabilityService.cs` (MODIFY)

In the explanation method (`GetSuitabilityExplanationAsync`), the Cypher query for a specific employee doesn't need a `LIMIT` since it targets a single employee. No changes needed there.

For the main suitability query, replace:
```cypher
RETURN ... ORDER BY suitabilityScore DESC LIMIT 5
```
With:
```cypher
RETURN ... ORDER BY suitabilityScore DESC SKIP $skip LIMIT $limit
```

Where `$skip = (pageNumber - 1) * pageSize` and `$limit = pageSize`.

---

## Task 5 — Make TaskManager Accept Server-Side Pagination

### 5.1 Update TMProps Interface

**File:** `frontend/src/components/TaskManager/TaskManager.tsx` (MODIFY)

Add server-side pagination props alongside the existing client-side ones:

```typescript
interface TMProps {
    // ... existing props ...

    // Server-side pagination (optional — when provided overrides client-side)
    serverPagination?: {
        currentPage: number;
        totalPages: number;
        totalRecords: number;
        pageSize: number;
        onPageChange: (page: number) => void;
        onPageSizeChange?: (size: number) => void;
    };
}
```

### 5.2 Update Internal Logic

When `serverPagination` prop is provided:
- Skip the client-side `slice()` — use `serverPagination.totalRecords` directly
- Pass `serverPagination` values to `<DataTable>` instead of computed `filtered.length` and `paginated`
- Disable `totalPages` calculation from `filtered.length`

```tsx
// When serverPagination is provided, use its values
const totalPages = serverPagination?.totalPages ?? Math.ceil(filtered.length / 8);
const paginated = serverPagination ? filtered : filtered.slice(...);
```

---

## Task 6 — Update OpAdmin Dashboard to Use Server-Side Pagination

### 6.1 Remove Hardcoded pageSize=200

**File:** `frontend/src/Pages/OpAdmin_Dashboard/OpAdmin_Dashboard.tsx` (MODIFY)

Replace:
```tsx
const res = await api.get('/api/Task?pageNumber=1&pageSize=200');
```
With:
```tsx
const res = await api.get('/api/Task', { pageNumber, pageSize });
```

### 6.2 Add Task Pagination State

```typescript
const [taskPage, setTaskPage] = useState(1);
const [taskTotalPages, setTaskTotalPages] = useState(1);
const [taskTotalRecords, setTaskTotalRecords] = useState(0);
const taskPageSize = 8;
```

### 6.3 Read Pagination from Response

When parsing the API response, read `jsonRes.data.totalCount`, `jsonRes.data.totalPages`, `jsonRes.data.pageNumber` and store them in the state variables instead of ignoring them.

### 6.4 Pass Server Pagination to TaskManager

```tsx
<TaskManager
    tasks={tmTasks}
    // ... existing props ...
    serverPagination={{
        currentPage: taskPage,
        totalPages: taskTotalPages,
        totalRecords: taskTotalRecords,
        pageSize: taskPageSize,
        onPageChange: (page) => {
            setTaskPage(page);
            // triggers re-fetch from API
        },
    }}
/>
```

### 6.5 Trigger Re-fetch on Page Change

When `taskPage` changes, the `useEffect` that fetches tasks should re-run with the new page number. Add `taskPage` to its dependency array:

```typescript
useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [taskPage, taskTab, ...existingDeps]);
```

---

## Summary of Files to Create/Modify

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `backend/Models/DTOs/PagedResponseDTO.cs` | Reusable paginated response DTO |

### Modified Files — Backend

| # | File | Change |
|---|------|--------|
| 2 | `backend/Modules/TaskManagement/ISuitabilityService.cs` | Add paged method overload |
| 3 | `backend/Modules/TaskManagement/SuitabilityService.cs` | Add paginated Cypher query with SKIP/LIMIT + count query |
| 4 | `backend/Controllers/SuitabilityController.cs` | Add optional `pageNumber`/`pageSize` query params |

### Modified Files — Frontend

| # | File | Change |
|---|------|--------|
| 5 | `frontend/src/services/aiService.ts` | Add `PagedResponseDTO` type, update `getSuitability` with pagination params |
| 6 | `frontend/src/components/AiRecommendationPanel/AiRecommendationPanel.tsx` | Add pagination state, pagination controls UI |
| 7 | `frontend/src/components/AiRecommendationPanel/AiRecommendationPanel.css` | Add pagination button styles |

---

## Backward Compatibility

The existing `GET /api/tasks/{taskId}/suitability` endpoint without pagination params will continue to work exactly as before, returning the top 5 employees. Existing callers (including the current frontend) don't need to change their code. The pagination parameters are fully optional with sensible defaults (`pageNumber=1`, `pageSize=5`).

The response shape changes from:
```json
{ "isSuccess": true, "data": [ {...}, ... ] }
```
To:
```json
{ "isSuccess": true, "data": { "items": [{...}, ...], "pageNumber": 1, "pageSize": 5, "totalCount": 12, "totalPages": 3 } }
```

The frontend `AiRecommendationPanel` will be updated to handle both shapes — if the response is a plain array (legacy), it wraps it; if it's a `PagedResponseDTO`, it uses the paginated structure.
