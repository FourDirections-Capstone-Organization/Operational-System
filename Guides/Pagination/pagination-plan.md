# Pagination Implementation Plan

## Overview

Add offset-based pagination (`pageNumber` + `pageSize`) to every API endpoint that returns a list of records from the database. This prevents unbounded data growth from degrading performance as the system scales.

---

## Why Offset-Based Pagination?

- **Simple to understand**: "Give me page 2, with 10 items per page"
- **Supports random access**: Users can jump directly to any page number
- **Familiar pattern**: Matches what frontend libraries (React Table, Ant Design, etc.) expect
- **Good enough for this scale**: Cursor-based pagination is unnecessary here since we don't have millions of real-time streaming records

---

## New Files to Create

### 1. `backend/Models/DTOs/PaginatedResponseDTO.cs`

A generic wrapper that replaces `List<T>` in responses. Instead of returning a bare list, every paginated endpoint wraps its data in this DTO.

```csharp
namespace Backend.Models.DTOs;

public class PaginatedResponseDTO<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int PageNumber { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}
```

**Rationale**: The frontend needs to know the total number of records and pages to render pagination controls (page numbers, "Next" button, etc.). `HasPreviousPage` and `HasNextPage` are convenience booleans so the frontend doesn't have to compute them.

### 2. `backend/Models/DTOs/PaginationQueryDTO.cs`

A base class for query parameters that every paginated endpoint accepts.

```csharp
namespace Backend.Models.DTOs;

public class PaginationQueryDTO
{
    private const int MaxPageSize = 100;
    private int _pageSize = 10;

    public int PageNumber { get; set; } = 1;

    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : value;
    }
}
```

**Rationale**: Defaults to page 1, 10 items per page. Caps at 100 to prevent someone from requesting `pageSize=999999` and crashing the server. Each endpoint can extend this with its own filters.

---

## Endpoints to Paginate

### Priority 1: High-Traffic / Unbounded Growth (Do First)

These endpoints query tables that grow continuously and will become large over time.

| # | Endpoint | Controller | Service Method | Current Return Type |
|---|----------|-----------|----------------|-------------------|
| 1 | `GET /api/task` | TaskController.GetAll | TaskService.GetAllAsync | `List<TaskResponseDTO>` |
| 2 | `GET /api/user` | UserController.GetAll | UserService.GetAllAsync | `List<UserResponseDTO>` |
| 3 | `GET /api/notification` | NotificationController.GetAll | NotificationService.GetByRecipientAsync | `List<NotificationResponseDTO>` |
| 4 | `GET /api/audit-logs` | AuditLogController.GetAll | AuditLogService.GetAllAsync | `List<AuditLogResponseDTO>` |

### Priority 2: Medium-Traffic / Moderate Growth (Do Second)

These return lists tied to a parent entity. Usually small, but can grow for active tasks/users.

| # | Endpoint | Controller | Service Method | Current Return Type |
|---|----------|-----------|----------------|-------------------|
| 5 | `GET /api/tasks/{taskId}/comments` | TaskCommentController.GetByTask | TaskCommentService.GetByTaskIdAsync | `List<TaskCommentResponseDTO>` |
| 6 | `GET /api/users/{userId}/recommendations` | RecommendationController.GetByAssignee | RecommendationService.GetByAssigneeIdAsync | `List<RecommendationResponseDTO>` |
| 7 | `GET /api/dashboard/employee-availability` | DashboardController.GetEmployeeAvailability | DashboardService.GetEmployeeAvailabilityAsync | `List<EmployeeAvailabilityResponseDTO>` |
| 8 | `GET /api/task/assignable-users` | TaskController.GetAssignableUsers | TaskService.GetAssignableUsersAsync | `List<TaskAssigneeDTO>` |

### Priority 3: Low-Traffic / Small Data Sets (Do Last)

These return small, bounded lists. Pagination is still added for consistency, but they'll rarely exceed a single page.

| # | Endpoint | Controller | Service Method | Current Return Type |
|---|----------|-----------|----------------|-------------------|
| 9 | `GET /api/tasks/{taskId}/recommendations` | RecommendationController.GetByTask | RecommendationService.GetByTaskIdAsync | `List<RecommendationResponseDTO>` |
| 10 | `GET /api/tasks/{taskId}/attachments` | AttachmentController.GetByTask | AttachmentService.GetByTaskIdAsync | `List<TaskAttachmentResponseDTO>` |
| 11 | `GET /api/tasktemplate` | TaskTemplateController.GetAll | TaskTemplateService.GetAllAsync | `List<TaskTemplateResponseDTO>` |
| 12 | `GET /api/department` | DepartmentController.GetAll | DepartmentService.GetAllAsync | `List<DepartmentResponseDTO>` |
| 13 | `GET /api/job-positions` | JobPositionController.GetAll | JobPositionService.GetAllAsync / GetByDepartmentAsync | `List<JobPositionResponseDTO>` |
| 14 | `GET /api/dashboard/workload/department` | DashboardController.GetWorkloadByDepartment | DashboardService.GetWorkloadByDepartmentAsync | `List<DepartmentWorkloadDTO>` |

### Endpoints That Should NOT Be Paginated

| Endpoint | Reason |
|----------|--------|
| `GET /api/role` | Static hardcoded list of 6 roles. Never changes. |
| `GET /api/reports/kpi` | Returns an aggregated KPI summary object, not a raw list. |
| `GET /api/reports/performance` | Returns an aggregated report object, not a raw list. |
| `GET /api/reports/performance-summary/{id}` | Returns a single employee summary object. |
| `GET /api/dashboard/metrics` | Returns an aggregated metrics object, not a raw list. |
| `GET /api/notificationsettings` | Returns a single settings object. |

---

## How to Implement (Step-by-Step)

### Step 1: Create the Two New DTO Files

Create `PaginatedResponseDTO.cs` and `PaginationQueryDTO.cs` as shown above.

### Step 2: Update Each Service Interface

Change the return type from `ApiResponseDTO<List<T>>` to `ApiResponseDTO<PaginatedResponseDTO<T>>`, and add `int pageNumber, int pageSize` parameters.

**Example for ITaskService:**

```csharp
// BEFORE:
Task<ApiResponseDTO<List<TaskResponseDTO>>> GetAllAsync(
    Guid requestUserId, UserRole requestUserRole, Guid? requestUserDepartmentId,
    TaskStatus? status = null, PriorityLevel? priority = null,
    TaskClassification? classification = null, Guid? assignedToUserId = null,
    Guid? departmentId = null, string? search = null);

// AFTER:
Task<ApiResponseDTO<PaginatedResponseDTO<TaskResponseDTO>>> GetAllAsync(
    Guid requestUserId, UserRole requestUserRole, Guid? requestUserDepartmentId,
    int pageNumber = 1, int pageSize = 10,
    TaskStatus? status = null, PriorityLevel? priority = null,
    TaskClassification? classification = null, Guid? assignedToUserId = null,
    Guid? departmentId = null, string? search = null);
```

### Step 3: Update Each Service Implementation

The core pattern is the same for every service. Here is the generic recipe:

```csharp
// BEFORE (example from TaskService.GetAllAsync):
var tasks = await query
    .OrderByDescending(t => t.CreatedAt)
    .ToListAsync();

var response = new List<TaskResponseDTO>();
foreach (var task in tasks)
    response.Add(await MapToResponseDTOAsync(task));

return ApiResponseDTO<List<TaskResponseDTO>>.Success(response);

// AFTER:
var totalCount = await query.CountAsync();

var tasks = await query
    .OrderByDescending(t => t.CreatedAt)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync();

var response = new List<TaskResponseDTO>();
foreach (var task in tasks)
    response.Add(await MapToResponseDTOAsync(task));

var paginatedResult = new PaginatedResponseDTO<TaskResponseDTO>
{
    Items = response,
    TotalCount = totalCount,
    PageNumber = pageNumber,
    PageSize = pageSize
};

return ApiResponseDTO<PaginatedResponseDTO<TaskResponseDTO>>.Success(paginatedResult);
```

**Key points:**
1. `CountAsync()` runs a `SELECT COUNT(*)` query separately -- this is cheap and gives us the total.
2. `Skip((pageNumber - 1) * pageSize)` skips all records before the current page.
3. `Take(pageSize)` limits results to only the current page.
4. The `OrderBy` MUST come before `Skip`/`Take` -- otherwise SQL Server throws an error.
5. The mapping loop only runs on the current page's items, not the entire table.

### Step 4: Update Each Controller

Add `[FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10` parameters and pass them to the service.

**Example for TaskController.GetAll:**

```csharp
// BEFORE:
[HttpGet]
public async Task<IActionResult> GetAll(
    [FromQuery] TaskStatus? status = null,
    [FromQuery] PriorityLevel? priority = null,
    ...)

// AFTER:
[HttpGet]
public async Task<IActionResult> GetAll(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] TaskStatus? status = null,
    [FromQuery] PriorityLevel? priority = null,
    ...)
```

Then pass `pageNumber` and `pageSize` into the service call.

### Step 5: Special Case for Services Using .Select() Projection

Some services (DepartmentService, JobPositionService) use `.Select()` to project directly into DTOs inside the LINQ query. For these, `CountAsync()` must be called BEFORE the `.Select()`, because `.Select()` changes the shape.

```csharp
// BEFORE (DepartmentService.GetAllAsync):
var departments = await _db.Departments
    .Where(d => d.IsActive)
    .Include(d => d.Users)
    .Include(d => d.JobPositions)
    .OrderBy(d => d.Name)
    .Select(d => new DepartmentResponseDTO { ... })
    .ToListAsync();

return ApiResponseDTO<List<DepartmentResponseDTO>>.Success(departments);

// AFTER:
var query = _db.Departments
    .Where(d => d.IsActive)
    .Include(d => d.Users)
    .Include(d => d.JobPositions);

var totalCount = await query.CountAsync();

var departments = await query
    .OrderBy(d => d.Name)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .Select(d => new DepartmentResponseDTO { ... })
    .ToListAsync();

var paginatedResult = new PaginatedResponseDTO<DepartmentResponseDTO>
{
    Items = departments,
    TotalCount = totalCount,
    PageNumber = pageNumber,
    PageSize = pageSize
};

return ApiResponseDTO<PaginatedResponseDTO<DepartmentResponseDTO>>.Success(paginatedResult);
```

### Step 6: Special Case for DashboardService.GetEmployeeAvailabilityAsync

This service doesn't use `.Select()` projection -- it maps in-memory. The pattern is the same as Step 3.

### Step 7: Special Case for DashboardService.GetWorkloadByDepartmentAsync

This endpoint does in-memory grouping after fetching from the database. Pagination must happen AFTER the grouping, not before.

```csharp
// The grouping produces the final list, so paginate that result:
var departmentWorkload = activeTasks
    .Where(t => t.AssignedDepartmentId.HasValue)
    .GroupBy(...)
    .Select(...)
    .OrderByDescending(d => d.TotalActiveTasks)
    .ToList();

var totalCount = departmentWorkload.Count;
var pagedItems = departmentWorkload
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToList();
```

---

## Complete File Change List

### New Files (2)
| File | Purpose |
|------|---------|
| `backend/Models/DTOs/PaginatedResponseDTO.cs` | Generic paginated response wrapper |
| `backend/Models/DTOs/PaginationQueryDTO.cs` | Reusable query parameter base class |

### Service Interfaces to Update (10)
| File | Methods Changed |
|------|----------------|
| `backend/Modules/TaskManagement/ITaskService.cs` | GetAllAsync, GetAssignableUsersAsync |
| `backend/Modules/UserAccountManagement/IUserService.cs` | GetAllAsync |
| `backend/Modules/Notifications/INotificationService.cs` | GetByRecipientAsync |
| `backend/Modules/TaskManagement/IAuditLogService.cs` | GetAllAsync |
| `backend/Modules/TaskManagement/ITaskCommentService.cs` | GetByTaskIdAsync |
| `backend/Modules/TaskManagement/IRecommendationService.cs` | GetByTaskIdAsync, GetByAssigneeIdAsync |
| `backend/Modules/TaskManagement/IAttachmentService.cs` | GetByTaskIdAsync |
| `backend/Modules/TaskManagement/ITaskTemplateService.cs` | GetAllAsync |
| `backend/Modules/OrganizationalStructure/IDepartmentService.cs` | GetAllAsync |
| `backend/Modules/OrganizationalStructure/IJobPositionService.cs` | GetAllAsync, GetByDepartmentAsync |

### Service Implementations to Update (11)
| File | Methods Changed |
|------|----------------|
| `backend/Modules/TaskManagement/TaskService.cs` | GetAllAsync, GetAssignableUsersAsync |
| `backend/Modules/UserAccountManagement/UserService.cs` | GetAllAsync |
| `backend/Modules/Notifications/NotificationService.cs` | GetByRecipientAsync |
| `backend/Modules/TaskManagement/AuditLogService.cs` | GetAllAsync |
| `backend/Modules/TaskManagement/TaskCommentService.cs` | GetByTaskIdAsync |
| `backend/Modules/TaskManagement/RecommendationService.cs` | GetByTaskIdAsync, GetByAssigneeIdAsync |
| `backend/Modules/TaskManagement/AttachmentService.cs` | GetByTaskIdAsync |
| `backend/Modules/TaskManagement/TaskTemplateService.cs` | GetAllAsync |
| `backend/Modules/OrganizationalStructure/DepartmentService.cs` | GetAllAsync |
| `backend/Modules/OrganizationalStructure/JobPositionService.cs` | GetAllAsync, GetByDepartmentAsync |
| `backend/Modules/TaskManagement/DashboardService.cs` | GetEmployeeAvailabilityAsync, GetWorkloadByDepartmentAsync |

### Controllers to Update (11)
| File | Endpoints Changed |
|------|------------------|
| `backend/Controllers/TaskController.cs` | GetAll, GetAssignableUsers |
| `backend/Controllers/UserController.cs` | GetAll |
| `backend/Controllers/NotificationController.cs` | GetAll |
| `backend/Controllers/AuditLogController.cs` | GetAll |
| `backend/Controllers/TaskCommentController.cs` | GetByTask |
| `backend/Controllers/RecommendationController.cs` | GetByTask, GetByAssignee |
| `backend/Controllers/AttachmentController.cs` | GetByTask |
| `backend/Controllers/TaskTemplateController.cs` | GetAll |
| `backend/Controllers/DepartmentController.cs` | GetAll |
| `backend/Controllers/JobPositionController.cs` | GetAll |
| `backend/Controllers/DashboardController.cs` | GetEmployeeAvailability, GetWorkloadByDepartment |

---

## Response Shape Change (Before vs After)

### Before (current)
```json
{
  "isSuccess": true,
  "message": "Success",
  "data": [
    { "id": "...", "title": "Task 1" },
    { "id": "...", "title": "Task 2" }
  ]
}
```

### After (paginated)
```json
{
  "isSuccess": true,
  "message": "Success",
  "data": {
    "items": [
      { "id": "...", "title": "Task 1" },
      { "id": "...", "title": "Task 2" }
    ],
    "totalCount": 150,
    "pageNumber": 1,
    "pageSize": 10,
    "totalPages": 15,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

---

## Manual Testing Guide

Use any HTTP client (Postman, browser, curl). Replace `{token}` with a valid JWT from login.

### Prerequisites

Login and get a token:
`POST /api/auth/login`
Body: `{ "email": "manager@stars.com", "password": "..." }`
Copy the token from the response.

### Test 1: Task List Pagination
```
GET /api/task?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- Response has "items" array with at most 5 entries
- "totalCount" matches the total number of tasks you can see
- "pageNumber" is 1, "pageSize" is 5
- "totalPages" = ceil(totalCount / 5)
- "hasPreviousPage" is false (first page)
- "hasNextPage" is true if totalCount > 5

Then test page 2:
GET /api/task?pageNumber=2&pageSize=5
Verify: "hasPreviousPage" is true, items are different from page 1

Test with filters:
GET /api/task?pageNumber=1&pageSize=5&status=InProgress
Verify: totalCount reflects only InProgress tasks
```

### Test 2: User List Pagination
```
GET /api/user?pageNumber=1&pageSize=3
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 3 users
- "totalCount" is total users in system
- Users are ordered by LastName, FirstName (existing sort)

GET /api/user?pageNumber=1&pageSize=3&role=Dispatcher
Verify: totalCount only counts Dispatchers
```

### Test 3: Notification List Pagination
```
GET /api/notification?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 5 notifications
- Notifications are ordered by CreatedAt descending (newest first)
- "totalCount" matches your total notification count
```

### Test 4: Audit Log Pagination
```
GET /api/audit-logs?pageNumber=1&pageSize=10
Headers: Authorization: Bearer {token}  (must be Manager role)

Verify:
- "items" has at most 10 entries
- Entries are ordered by Timestamp descending
- "totalCount" is total audit log entries

Test with filters:
GET /api/audit-logs?pageNumber=1&pageSize=10&module=TaskManagement
Verify: totalCount only counts TaskManagement entries
```

### Test 5: Task Comments Pagination
```
GET /api/tasks/{taskId}/comments?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 5 comments
- Comments are ordered by CreatedAt ascending (oldest first)
```

### Test 6: Recommendations by Assignee Pagination
```
GET /api/users/{userId}/recommendations?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 5 recommendations
- "totalCount" is total recommendations for that user
```

### Test 7: Department List Pagination
```
GET /api/department?pageNumber=1&pageSize=2
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 2 departments
- "totalCount" is total active departments (likely 4)
- "totalPages" = 2
```

### Test 8: Job Position List Pagination
```
GET /api/job-positions?pageNumber=1&pageSize=3
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 3 positions
- "totalCount" is total active positions

Also test with department filter:
GET /api/job-positions?departmentId={id}&pageNumber=1&pageSize=3
```

### Test 9: Task Template List Pagination
```
GET /api/tasktemplate?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 5 templates
- Ordered by CreatedAt descending
```

### Test 10: Attachment List Pagination
```
GET /api/tasks/{taskId}/attachments?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 5 attachments
- Ordered by CreatedAt descending
```

### Test 11: Assignable Users Pagination
```
GET /api/task/assignable-users?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}

Verify:
- "items" has at most 5 assignable users
- "totalCount" is total assignable users (Dispatchers, Encoders, Couriers, Accountants who are active)
```

### Test 12: Employee Availability Pagination
```
GET /api/dashboard/employee-availability?pageNumber=1&pageSize=5
Headers: Authorization: Bearer {token}  (Coordinator+)

Verify:
- "items" has at most 5 employees
- "totalCount" is total active employees
```

### Test 13: Workload by Department Pagination
```
GET /api/dashboard/workload/department?pageNumber=1&pageSize=2
Headers: Authorization: Bearer {token}  (Coordinator+)

Verify:
- "items" has at most 2 department workload entries
- Ordered by TotalActiveTasks descending
```

### Edge Case Tests
```
1. Page beyond range:
   GET /api/task?pageNumber=999&pageSize=10
   Verify: "items" is empty array, "totalCount" is correct, "hasNextPage" is false

2. Invalid page number:
   GET /api/task?pageNumber=0&pageSize=10
   Verify: Service handles gracefully (either returns page 1 or returns error)

3. Oversized page size:
   GET /api/task?pageNumber=1&pageSize=500
   Verify: pageSize is capped at 100 (or whatever max you set)

4. Default values:
   GET /api/task
   Verify: Returns page 1 with default page size (10)
```

---

## Implementation Order

1. Create `PaginatedResponseDTO.cs` and `PaginationQueryDTO.cs`
2. Implement Priority 1 (Tasks, Users, Notifications, Audit Logs) -- these are the most impactful
3. Implement Priority 2 (Comments, Recommendations, Availability, Assignable Users)
4. Implement Priority 3 (Attachments, Templates, Departments, Job Positions, Workload)
5. Run all manual tests above
6. Update frontend to handle the new response shape (`data.items` instead of `data` directly)
