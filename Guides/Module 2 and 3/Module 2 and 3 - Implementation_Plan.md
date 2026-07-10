# STARS Module 2 and 3 - Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for **Module 2: Task Management** and **Module 3: Task Notifications** of the Speedex Task Allocation & Review System (STARS).

**Tech Stack:**
- **Backend:** ASP.NET Core 9.0, Entity Framework Core, PostgreSQL
- **Pattern:** Controller → Service (Interface) → DbContext (modular folder structure)
- **Auth:** JWT with role-based authorization policies (from Module 1)
- **File Storage:** Local file system with configurable path
- **Background Jobs:** .NET Hosted Service (IHostedService) for recurring tasks and SLA checks

---

## API Response Standard

All API endpoints return responses wrapped in `ApiResponseDTO<T>` to ensure consistency:

```csharp
public class ApiResponseDTO<T>
{
    public bool IsSuccess { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
}
```

**HTTP Status Codes:**
- `200 OK` - Success with data
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation error or business logic failure
- `401 Unauthorized` - Authentication failed or session expired
- `403 Forbidden` - User lacks permission
- `404 Not Found` - Resource not found

---

## Module Structure

Modules 2 and 3 are divided into **5 sub-modules** with **19 Functional Requirements (FRs)**:

| Sub-Module | FRs Covered | Focus Area |
|------------|-------------|------------|
| 2.1 Task Creation & SLA | FR-017 to FR-021 | Creating tasks, attachments, destination scoping, priority, urgent SLA |
| 2.2 Task Workflow (FSM) | FR-022 to FR-026 | State machine transitions, push-back, completion restriction, on-hold, cancellation |
| 2.3 Recurring Task Automation | FR-027 to FR-029 | Task templates, auto-generation, availability validation |
| 2.4 Recommendations & Remarks | FR-030 to FR-032 | Recommendations, evaluation archiving, task comments |
| 3.1 Task Notifications | FR-033 to FR-035 | In-app + email notifications, deadline alerts, overdue escalation |

---

## Implementation Order

The sub-modules should be implemented in this order because each one builds on the previous:

```
2.1 Task Creation & SLA          ← Build first (core task model is needed by everything)
    ↓
2.2 Task Workflow (FSM)          ← Build second (needs tasks to exist for workflow)
    ↓
3.1 Task Notifications           ← Build third (needs tasks + workflow for triggers)
    ↓
2.3 Recurring Task Automation    ← Build fourth (needs task creation + notifications)
    ↓
2.4 Recommendations & Remarks    ← Build last (needs tasks + workflow for context)
```

**Why this order?**
1. **2.1 first** - We need the Task model, attachments, and basic creation before anything else
2. **2.2 second** - Workflow (state machine) needs tasks to exist; it defines how tasks move through statuses
3. **3.1 third** - Notifications need task events (created, updated, overdue) to trigger on
4. **2.3 fourth** - Recurring tasks auto-create tasks using 2.1 and send notifications using 3.1
5. **2.4 last** - Recommendations and comments need completed/in-progress tasks to attach to

---

## Detailed Breakdown

### Phase 1: Sub-Module 2.1 - Task Creation & SLA (FR-017 to FR-021)

**Why first?** The Task model is the core of the entire system. Every other sub-module depends on tasks existing.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-017 | Task Form Configuration | `Task` model, Task CRUD endpoints, task creation with all fields |
| FR-018 | Document Memo Attachments | `TaskAttachment` model, file upload/download endpoints, file validation |
| FR-019 | Destination Scoping | `AssignmentScope` enum, scope-based assignment logic (Single/Team/Department) |
| FR-020 | Priority & Urgency Classification | `TaskClassification` enum (Routine/Special), filter support |
| FR-021 | Urgent SLA Enforcement | Auto-calculate 24h deadline for Urgent tasks, lock deadline field |

**Backend Files to Create:**
- `Models/Task.cs`
- `Models/TaskAttachment.cs`
- `Models/Enums/TaskStatus.cs`
- `Models/Enums/PriorityLevel.cs`
- `Models/Enums/TaskClassification.cs`
- `Models/Enums/AssignmentScope.cs`
- `Models/DTOs/CreateTaskDTO.cs`
- `Models/DTOs/TaskResponseDTO.cs`
- `Models/DTOs/TaskAttachmentDTO.cs`
- `Modules/TaskManagement/ITaskService.cs`
- `Modules/TaskManagement/TaskService.cs`
- `Modules/TaskManagement/IAttachmentService.cs`
- `Modules/TaskManagement/AttachmentService.cs`
- `Controllers/TaskController.cs`
- `Controllers/AttachmentController.cs`
- Update `Data/AppDbContext.cs` with new DbSets

**Key Concepts:**
- File upload with size/type validation
- Enums for task status, priority, classification, scope
- Urgent SLA = creation timestamp + 24 hours (auto-enforced)
- Assignment scoping (Single Employee, Team, Department)

---

### Phase 2: Sub-Module 2.2 - Task Workflow / FSM (FR-022 to FR-026)

**Why second?** Now that tasks exist, we need to control how they move through statuses.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-022 | FSM Progression Enforcement | State machine: Not Started → In Progress → Done/Pending Review → Completed |
| FR-023 | Workflow Reversal (Push Back) | Push back from Done/Pending Review → In Progress with mandatory comment |
| FR-024 | Task Completion Restriction | Only Coordinator/Manager can approve to Completed; employees stop at Done |
| FR-025 | On-Hold Pause Mechanism | Place On Hold (pause SLA), Resume with revised deadline |
| FR-026 | Task Cancellation | Cancel active tasks with mandatory reason |

**Backend Files to Create:**
- `Modules/TaskManagement/ITaskWorkflowService.cs`
- `Modules/TaskManagement/TaskWorkflowService.cs`
- `Models/Enums/TaskStatus.cs` (update with On Hold, Cancelled)
- `Models/DTOs/TaskStatusUpdateDTO.cs`
- `Models/DTOs/PushBackDTO.cs`
- `Models/DTOs/PlaceOnHoldDTO.cs`
- `Models/DTOs/ResumeTaskDTO.cs`
- `Models/DTOs/CancelTaskDTO.cs`
- `Models/DTOs/ReviewTaskDTO.cs`
- Update `Controllers/TaskController.cs` with workflow endpoints

**Key Concepts:**
- Finite State Machine (FSM) (A system that controls which status transitions are allowed)
- Allowed transitions map (dictionary of valid state changes)
- Role-based transition restrictions (who can do what)
- SLA pause/resume on hold

---

### Phase 3: Sub-Module 3.1 - Task Notifications (FR-033 to FR-035)

**Why third?** Notifications need task events to trigger on. Built after tasks and workflow exist.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-033 | Basic Notification Alerts | `Notification` model, in-app + email notifications for task events |
| FR-034 | Configurable Deadline Alerts | `NotificationSettings` model, configurable threshold (hours/days) |
| FR-035 | Overdue Escalation | Background job to detect overdue tasks, escalate to assignee + creator + Manager |

**Backend Files to Create:**
- `Models/Notification.cs`
- `Models/NotificationSettings.cs`
- `Models/Enums/NotificationType.cs`
- `Models/DTOs/NotificationResponseDTO.cs`
- `Models/DTOs/NotificationSettingsDTO.cs`
- `Modules/Notifications/INotificationService.cs`
- `Modules/Notifications/NotificationService.cs`
- `Modules/Notifications/INotificationSettingsService.cs`
- `Modules/Notifications/NotificationSettingsService.cs`
- `Modules/Notifications/OverdueCheckService.cs` (IHostedService)
- `Controllers/NotificationController.cs`
- `Controllers/NotificationSettingsController.cs`
- Update `Modules/Email/IEmailService.cs` with notification email methods
- Update `Program.cs` to register hosted service

**Key Concepts:**
- In-app notifications (database-stored, read/unread status)
- Email notifications (via existing SMTP service)
- Background hosted service (IHostedService) (A background process that runs on a timer)
- Configurable deadline thresholds
- Overdue detection and escalation

---

### Phase 4: Sub-Module 2.3 - Recurring Task Automation (FR-027 to FR-029)

**Why fourth?** Recurring tasks auto-create tasks (needs 2.1) and send notifications (needs 3.1).

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-027 | Template Configuration | `TaskTemplate` model, template CRUD with recurrence rules |
| FR-028 | Template Deployment Controls | Auto-generation via background job + manual deploy endpoint |
| FR-029 | Template Availability Validation | Check assignee availability before auto-assign, fallback to Unassigned |

**Backend Files to Create:**
- `Models/TaskTemplate.cs`
- `Models/Enums/RecurrenceRule.cs`
- `Models/DTOs/CreateTaskTemplateDTO.cs`
- `Models/DTOs/TaskTemplateResponseDTO.cs`
- `Modules/TaskManagement/ITaskTemplateService.cs`
- `Modules/TaskManagement/TaskTemplateService.cs`
- `Modules/TaskManagement/RecurringTaskGenerator.cs` (IHostedService)
- `Controllers/TaskTemplateController.cs`
- Update `Program.cs` to register hosted service

**Key Concepts:**
- Recurrence rules (Daily, Weekly, Monthly)
- Background job for auto-generation (IHostedService)
- Duplicate prevention (don't generate twice for same period)
- Assignee availability check (Active/Offline/On Leave/Deactivated)
- Manual deploy on-demand

---

### Phase 5: Sub-Module 2.4 - Recommendations & Remarks (FR-030 to FR-032)

**Why last?** Recommendations need tasks and workflow to exist; comments need task access control.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-030 | Recommendations Input Field | `Recommendation` model, structured form (category + notes) |
| FR-031 | Evaluation Archiving | Auto-archive to assignee profile, chronological history view |
| FR-032 | Task Comments Thread | `TaskComment` model, CRUD with attachments, chronological thread |

**Backend Files to Create:**
- `Models/Recommendation.cs`
- `Models/TaskComment.cs`
- `Models/Enums/RecommendationCategory.cs`
- `Models/DTOs/CreateRecommendationDTO.cs`
- `Models/DTOs/RecommendationResponseDTO.cs`
- `Models/DTOs/CreateTaskCommentDTO.cs`
- `Models/DTOs/TaskCommentResponseDTO.cs`
- `Modules/TaskManagement/IRecommendationService.cs`
- `Modules/TaskManagement/RecommendationService.cs`
- `Modules/TaskManagement/ITaskCommentService.cs`
- `Modules/TaskManagement/TaskCommentService.cs`
- `Controllers/RecommendationController.cs`
- `Controllers/TaskCommentController.cs`

**Key Concepts:**
- Structured recommendations (category + notes, not free-text)
- Auto-archiving to assignee profile (read-only history)
- Comment threads with optional file attachments
- Only edit/delete own comments

---

## Database Schema Overview

After Modules 2 and 3, the database will have these new tables:

```
┌─────────────────────────────────────────────────┐
│                      Task                        │
├─────────────────────────────────────────────────┤
│ Id (PK)                                         │
│ Title (max 150)                                 │
│ Description (max 2000)                          │
│ PriorityLevel (Enum: Low, Medium, High, Urgent) │
│ Classification (Enum: Routine, Special)         │
│ Status (Enum: NotStarted, InProgress,           │
│   DonePendingReview, Completed, OnHold,         │
│   Cancelled)                                    │
│ AssignmentScope (Enum: SingleEmployee,          │
│   Team, Department)                             │
│ CreatedById (FK → User)                         │
│ AssignedDepartmentId (FK → Department)          │
│ Deadline (DateTime)                             │
│ IsSLALocked (bool - for Urgent tasks)           │
│ PreviousStatus (for On-Hold resume)             │
│ HoldReason, CancellationReason                  │
│ RevisedDeadline (after hold resume)             │
│ CreatedAt, UpdatedAt                            │
└─────────────────────────────────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────┐  ┌──────────────────────┐
│   TaskAttachment     │  │    TaskComment        │
├──────────────────────┤  ├──────────────────────┤
│ Id (PK)              │  │ Id (PK)              │
│ TaskId (FK)          │  │ TaskId (FK)          │
│ FileName             │  │ AuthorId (FK→User)   │
│ FilePath             │  │ Content (max 1000)   │
│ FileSize             │  │ AttachmentFilePath   │
│ FileType             │  │ IsDeleted            │
│ Description (max 250)│  │ CreatedAt, UpdatedAt │
│ UploadedById (FK)    │  └──────────────────────┘
│ CreatedAt            │
└──────────────────────┘

┌──────────────────────────────┐
│      TaskAssignment          │
├──────────────────────────────┤
│ Id (PK)                      │
│ TaskId (FK)                  │
│ AssignedUserId (FK → User)   │
│ AssignedAt                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│       TaskTemplate           │
├──────────────────────────────┤
│ Id (PK)                      │
│ TemplateName (max 150)       │
│ DefaultTitle                 │
│ DefaultDescription           │
│ DefaultPriorityLevel         │
│ DefaultAssigneeId (FK→User)  │
│ RecurrenceRule (Enum)        │
│ RecurrenceStartdate          │
│ NextGenerationDate           │
│ LastGeneratedDate            │
│ IsActive                     │
│ CreatedById (FK → User)      │
│ CreatedAt, UpdatedAt         │
└──────────────────────────────┘

┌──────────────────────────────┐
│      Recommendation          │
├──────────────────────────────┤
│ Id (PK)                      │
│ TaskId (FK)                  │
│ AssigneeId (FK → User)       │
│ CoordinatorId (FK → User)    │
│ Category (Enum)              │
│ Notes (max 1000)             │
│ CreatedAt                    │
└──────────────────────────────┘

┌──────────────────────────────┐
│       Notification           │
├──────────────────────────────┤
│ Id (PK)                      │
│ RecipientId (FK → User)      │
│ Type (Enum)                  │
│ Title                        │
│ Message                      │
│ RelatedTaskId (FK, nullable) │
│ IsRead                       │
│ CreatedAt                    │
└──────────────────────────────┘

┌──────────────────────────────┐
│    NotificationSettings      │
├──────────────────────────────┤
│ Id (PK)                      │
│ DeadlineWarningValue (int)   │
│ DeadlineWarningUnit (Enum)   │
│ UpdatedAt                    │
└──────────────────────────────┘
```

---

## API Endpoints Summary

### Task Creation & SLA (2.1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create task (Coordinator only) |
| GET | `/api/tasks` | Get all tasks (with filters) |
| GET | `/api/tasks/{id}` | Get task by ID |
| PUT | `/api/tasks/{id}` | Update task details (Coordinator only) |
| POST | `/api/tasks/{id}/attachments` | Upload attachment (Coordinator only) |
| GET | `/api/tasks/{id}/attachments` | Get task attachments |
| GET | `/api/tasks/{id}/attachments/{attachmentId}` | Download attachment |
| DELETE | `/api/tasks/{id}/attachments/{attachmentId}` | Delete attachment |

### Task Workflow (2.2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/tasks/{id}/status` | Update task status (FSM enforced) |
| PATCH | `/api/tasks/{id}/push-back` | Push back to In Progress (Coordinator only) |
| PATCH | `/api/tasks/{id}/review` | Approve/Return for rework (Coordinator/Manager) |
| PATCH | `/api/tasks/{id}/hold` | Place on hold (Coordinator only) |
| PATCH | `/api/tasks/{id}/resume` | Resume from hold (Coordinator only) |
| PATCH | `/api/tasks/{id}/cancel` | Cancel task (Coordinator only) |

### Recurring Task Automation (2.3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/task-templates` | Create template (Coordinator only) |
| GET | `/api/task-templates` | Get all templates |
| GET | `/api/task-templates/{id}` | Get template by ID |
| PUT | `/api/task-templates/{id}` | Update template (Coordinator only) |
| DELETE | `/api/task-templates/{id}` | Deactivate template (Coordinator only) |
| POST | `/api/task-templates/{id}/deploy` | Manual deploy (Coordinator only) |

### Recommendations & Remarks (2.4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/{id}/recommendations` | Add recommendation (Coordinator only) |
| GET | `/api/tasks/{id}/recommendations` | Get task recommendations |
| GET | `/api/users/{id}/recommendations` | Get user recommendation history |
| POST | `/api/tasks/{id}/comments` | Add comment (authorized users) |
| GET | `/api/tasks/{id}/comments` | Get comment thread |
| PUT | `/api/tasks/{id}/comments/{commentId}` | Edit own comment |
| DELETE | `/api/tasks/{id}/comments/{commentId}` | Delete own comment |

### Task Notifications (3.1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get current user's notifications |
| GET | `/api/notifications/unread-count` | Get unread notification count |
| PATCH | `/api/notifications/{id}/read` | Mark notification as read |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| GET | `/api/notification-settings` | Get deadline alert settings |
| PUT | `/api/notification-settings` | Update deadline alert settings (Coordinator only) |

---

## File Structure After Modules 2 and 3

```
backend/
├── Controllers/
│   ├── TaskController.cs              ← NEW
│   ├── AttachmentController.cs        ← NEW
│   ├── TaskTemplateController.cs      ← NEW
│   ├── RecommendationController.cs    ← NEW
│   ├── TaskCommentController.cs       ← NEW
│   ├── NotificationController.cs      ← NEW
│   └── NotificationSettingsController.cs ← NEW
├── Data/
│   └── AppDbContext.cs                ← UPDATED
├── Models/
│   ├── Task.cs                        ← NEW
│   ├── TaskAttachment.cs              ← NEW
│   ├── TaskAssignment.cs              ← NEW
│   ├── TaskTemplate.cs                ← NEW
│   ├── Recommendation.cs              ← NEW
│   ├── TaskComment.cs                 ← NEW
│   ├── Notification.cs                ← NEW
│   ├── NotificationSettings.cs        ← NEW
│   ├── Enums/
│   │   ├── TaskStatus.cs              ← NEW
│   │   ├── PriorityLevel.cs           ← NEW
│   │   ├── TaskClassification.cs      ← NEW
│   │   ├── AssignmentScope.cs         ← NEW
│   │   ├── RecurrenceRule.cs          ← NEW
│   │   ├── RecommendationCategory.cs  ← NEW
│   │   ├── NotificationType.cs        ← NEW
│   │   └── DeadlineWarningUnit.cs     ← NEW
│   └── DTOs/
│       ├── CreateTaskDTO.cs           ← NEW
│       ├── UpdateTaskDTO.cs           ← NEW
│       ├── TaskResponseDTO.cs         ← NEW
│       ├── TaskAttachmentDTO.cs       ← NEW
│       ├── TaskStatusUpdateDTO.cs     ← NEW
│       ├── PushBackDTO.cs             ← NEW
│       ├── ReviewTaskDTO.cs           ← NEW
│       ├── PlaceOnHoldDTO.cs          ← NEW
│       ├── ResumeTaskDTO.cs           ← NEW
│       ├── CancelTaskDTO.cs           ← NEW
│       ├── CreateTaskTemplateDTO.cs   ← NEW
│       ├── TaskTemplateResponseDTO.cs ← NEW
│       ├── CreateRecommendationDTO.cs ← NEW
│       ├── RecommendationResponseDTO.cs ← NEW
│       ├── CreateTaskCommentDTO.cs    ← NEW
│       ├── TaskCommentResponseDTO.cs  ← NEW
│       ├── NotificationResponseDTO.cs ← NEW
│       └── NotificationSettingsDTO.cs ← NEW
├── Modules/
│   └── TaskManagement/
│       ├── ITaskService.cs            ← NEW
│       ├── TaskService.cs             ← NEW
│       ├── ITaskWorkflowService.cs    ← NEW
│       ├── TaskWorkflowService.cs     ← NEW
│       ├── IAttachmentService.cs      ← NEW
│       ├── AttachmentService.cs       ← NEW
│       ├── ITaskTemplateService.cs    ← NEW
│       ├── TaskTemplateService.cs     ← NEW
│       ├── IRecommendationService.cs  ← NEW
│       ├── RecommendationService.cs   ← NEW
│       ├── ITaskCommentService.cs     ← NEW
│       ├── TaskCommentService.cs      ← NEW
│       ├── RecurringTaskGenerator.cs  ← NEW (IHostedService)
│   └── Notifications/
│       ├── INotificationService.cs    ← NEW
│       ├── NotificationService.cs     ← NEW
│       ├── INotificationSettingsService.cs ← NEW
│       ├── NotificationSettingsService.cs ← NEW
│       └── OverdueCheckService.cs     ← NEW (IHostedService)
├── Middleware/
│   └── SessionTimeoutMiddleware.cs    ← EXISTING
├── Program.cs                         ← UPDATED
└── appsettings.json                   ← UPDATED
```

---

## Configuration Changes

### appsettings.json (Add these sections)

```json
{
  "FileStorageSettings": {
    "UploadPath": "uploads/",
    "MaxFileSizeBytes": 20971520,
    "AllowedFileTypes": [ ".pdf", ".docx", ".xlsx", ".jpg", ".png" ]
  },
  "NotificationSettings": {
    "DefaultDeadlineWarningValue": 2,
    "DefaultDeadlineWarningUnit": "Days",
    "OverdueCheckIntervalInMinutes": 15
  },
  "RecurringTaskSettings": {
    "GenerationCheckIntervalInMinutes": 60
  }
}
```

---

## NuGet Packages Required

No new NuGet packages needed. We use:
- **MailKit** (already installed) - for email notifications
- **Microsoft.AspNetCore.Authentication.JwtBearer** (already installed) - for auth
- **Npgsql.EntityFrameworkCore.PostgreSQL** (already installed) - for database

File uploads use built-in ASP.NET Core `IFormFile` - no external packages needed.
Background jobs use built-in `IHostedService` - no external packages needed (like Hangfire/Quartz).

---

## Testing Checklist

### Sub-Module 2.1 (Task Creation & SLA)
- [ ] Can create task with all required fields
- [ ] Task ID is system-generated
- [ ] Only Coordinators can create tasks
- [ ] File upload validates type (PDF, DOCX, XLSX, JPG, PNG) and size (20MB max)
- [ ] Assignment scope works for Single Employee, Team, Department
- [ ] Urgent tasks auto-set deadline to creation + 24 hours
- [ ] Urgent task deadline is locked (not editable)
- [ ] Task classification (Routine/Special) is required and filterable

### Sub-Module 2.2 (Task Workflow)
- [ ] Tasks start at Not Started
- [ ] FSM enforces: Not Started → In Progress → Done/Pending Review → Completed
- [ ] Skipping states is rejected
- [ ] Only assigned employee can advance Not Started → In Progress → Done
- [ ] Only Coordinator/Manager can approve to Completed
- [ ] Push back requires comment and reverts to In Progress
- [ ] On-Hold pauses SLA countdown
- [ ] Resume requires revised deadline
- [ ] Cancellation requires reason, only active tasks can be cancelled
- [ ] Completed tasks are locked from modification

### Sub-Module 3.1 (Task Notifications)
- [ ] In-app notification created on task assignment
- [ ] Email sent on task assignment
- [ ] Notifications have read/unread status
- [ ] Can mark notification as read
- [ ] Deadline warning threshold is configurable (hours/days)
- [ ] Overdue tasks trigger escalation to assignee + creator + Manager
- [ ] Overdue tasks are visually flagged

### Sub-Module 2.3 (Recurring Task Automation)
- [ ] Can create task template with recurrence rule
- [ ] Auto-generation creates tasks on schedule
- [ ] Manual deploy creates task on demand
- [ ] Inactive templates don't generate tasks
- [ ] Duplicate generation is prevented
- [ ] Unavailable assignee → task set to Unassigned + Coordinator alerted

### Sub-Module 2.4 (Recommendations & Remarks)
- [ ] Only Coordinators can add recommendations
- [ ] Recommendations require category + notes
- [ ] Recommendations auto-archive to assignee profile
- [ ] Recommendation history is read-only and chronological
- [ ] Authorized users can add comments to tasks
- [ ] Users can only edit/delete their own comments
- [ ] Comments support optional file attachments

---

## Guide Documents

Each sub-module has its own detailed guide:

1. **[2.1_Task_Creation_and_SLA.md](./2.1_Task_Creation_and_SLA.md)** - FR-017 to FR-021
2. **[2.2_Task_Workflow_FSM.md](./2.2_Task_Workflow_FSM.md)** - FR-022 to FR-026
3. **[2.3_Recurring_Task_Automation.md](./2.3_Recurring_Task_Automation.md)** - FR-027 to FR-029
4. **[2.4_Recommendations_and_Remarks.md](./2.4_Recommendations_and_Remarks.md)** - FR-030 to FR-032
5. **[3.1_Task_Notifications.md](./3.1_Task_Notifications.md)** - FR-033 to FR-035

Each guide contains:
- High-Level Pseudocode
- Concept Explanations
- Full Code Implementation
- Q&A Section

---

## Notes

- **Frontend is out of scope** - The frontend developer will handle UI implementation
- **Existing patterns** - We follow the existing Controller → Module Service → DbContext pattern
- **ApiResponseDTO** - All endpoints return `ApiResponseDTO<T>` wrapper
- **Soft deletes** - We use `IsActive` flags instead of hard deletes for audit compliance
- **Audit Log** - Every significant action is logged (to be enhanced in a future module)
- **File Storage** - Files stored locally in `uploads/` directory (configurable path)
- **Background Jobs** - Use built-in `IHostedService` (no external packages like Hangfire)
- **Authorization** - Uses existing JWT + policy-based authorization from Module 1
