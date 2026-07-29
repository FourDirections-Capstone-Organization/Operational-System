# AI Recommendation — Frontend Integration Plan

## Overview

Connect the backend AI/ML suitability engine (`GET /api/tasks/{taskId}/suitability`) to the Task Creation flow in the frontend. The AI recommendation must be **decoupled** from task creation — the user can create and assign tasks with or without AI suggestions.

---

## Task 1 — Study & Analyze Frontend Task Creation Flow

### Current Architecture

Task creation exists in **three** locations:

| Location | File | Route | Used By |
|----------|------|-------|---------|
| OpAdmin Dashboard (TaskModal) | `src/Pages/OpAdmin_Dashboard/OpAdmin_Dashboard.tsx:590-1325` | `/OpAdmin_Dashboard` | Coordinators (primary) |
| AI Assignment View (standalone) | `src/Pages/EmergingTechAI/AIAssignmentView.tsx` | `/OpAdmin_Dashboard` (sub-tab) | Coordinators |
| SystemAdmin Dashboard (FormModal) | `src/Pages/SystemAdmin_Dashboard/SystemAdmin_Dashboard.tsx` | `/SystemAdmin_Dashboard` | Managers |

### Task Creation Flow (OpAdmin — primary target)

```
User opens TaskModal
  → fills title, description, priority, classification, deadline
  → selects assignment scope (SingleEmployee / Team / Department)
    → SingleEmployee: employee picker with search + availability display
    → Team: multi-select employee checklist
    → Department: department dropdown
  → User clicks "Save"
  → POST /api/Task with CreateTaskDTO payload
  → Task is created + assigned
```

### Existing Recommendation Logic (simple heuristic)

Currently in `OpAdmin_Dashboard.tsx:634-692`:
```typescript
const best = activeEmployees.reduce((a, b) => a.workload <= b.workload ? a : b);
```
This selects the employee with the **lowest workload** and shows a `"Recommended: {name}"` banner. No AI/ML is used.

### Key API Endpoints Currently Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/Task/assignable-users?pageNumber=1&pageSize=50` | Fetch employees with workload/availability |
| `POST` | `/api/Task` | Create task |
| `POST` | `/api/Duplicate/check` | Check for duplicate tasks |

### Goal

Replace the simple workload-based recommendation with the AI/ML suitability engine, while keeping the feature optional.

---

## Task 2 — AI API Endpoint Analysis

### Backend AI Endpoints to Integrate

| Method | Endpoint | Returns | Authorization |
|--------|----------|---------|---------------|
| `GET` | `/api/tasks/{taskId}/suitability` | `SuitabilityResponseDTO[]` (top 5 ranked employees) | CoordinatorAndAbove |
| `GET` | `/api/tasks/{taskId}/suitability/{empId}/explain` | `SuitabilityExplanationDTO` (breakdown) | CoordinatorAndAbove |
| `GET` | `/api/tasks/{taskId}/sla-risk` | `SlaRiskResponseDTO` (risk prediction) | CoordinatorAndAbove |
| `GET` | `/api/tasks/{taskId}/sla-risk/explain` | `SlaRiskExplanationDTO` (feature contributions) | CoordinatorAndAbove |

### SuitabilityResponseDTO (what the AI returns)

```typescript
interface SuitabilityResponseDTO {
    employeeId: string;
    employeeNumber: string;
    fullName: string;
    role: string;
    workload: number;
    suitabilityScore: number;
}
```

### Integration Point

The suitability endpoint requires a **taskId** — meaning the task must first be created (or at least saved temporarily) before the AI can rank employees. This presents a flow challenge:

**Option A — Create task first, then recommend (preferred — decoupled)**
1. User creates task normally → `POST /api/Task`
2. After creation, the system queries `GET /api/tasks/{taskId}/suitability`
3. Displays AI suggestions in a separate panel or post-creation step
4. User can optionally re-assign based on AI suggestion

**Option B — Pre-select before creation (coupled — not recommended)**
1. User selects department → UI calls a pre-built suitability endpoint (doesn't exist yet)
2. AI suggests employees before task creation
3. User picks one and creates task
4. Harder to keep decoupled; requires new backend endpoint

**Decision: Option A** — The AI is an advisory feature that runs after task creation. The user sees AI suggestions in the task detail view and can optionally re-assign.

---

## Task 3 — Implement AI Recommendation Integration

### 3.1 Create a Standalone `AiRecommendationPanel` Component

**File:** `src/components/AiRecommendationPanel/AiRecommendationPanel.tsx` (NEW)

A decoupled component that can be placed anywhere in the UI. It takes a `taskId` prop and fetches AI suitability data independently.

```typescript
interface AiRecommendationPanelProps {
    taskId: string;
    onAssign?: (employeeId: string) => void;  // optional callback
}
```

**Component behavior:**
- On mount, fetches `GET /api/tasks/{taskId}/suitability`
- Displays a ranked list of top 5 employees with:
  - Employee name, number, role
  - Suitability score (visual bar/progress indicator)
  - Current workload
  - "Best Pick" badge for the top scorer
- Clicking an employee shows explanation `GET /api/tasks/{taskId}/suitability/{empId}/explain`
- Clicking "Assign" calls the optional `onAssign` callback
- Has its own loading, error, and empty states
- **No coupling to task creation** — works independently

### 3.2 Add AI Tab to TaskView Side Panel

**File:** `src/components/TaskView/TaskView.tsx` (MODIFY)

The existing `TaskView` side panel has tabs: `Details`, `Attachments`, `Comments`, `Recommendations`, `Activity Logs`.

**Change:** Add a new `AI Insights` tab that renders the `AiRecommendationPanel`.

```typescript
// Inside TaskView.tsx — add tab
{ task && <AiRecommendationPanel taskId={task.id} /> }
```

This tab shows:
- **Suitability Rankings** — Top 5 employees for this task (from Neo4j graph)
- **Risk Prediction** — SLA risk level from ML model (Low/Medium/High)
- **Feature Explanation** — Breakdown of why the model predicted that risk
- The data loads on-demand when the tab is selected

### 3.3 Add AI Summary to Task List

**File:** `src/components/TaskManager/TaskManager.tsx` (MODIFY)

Add an `AI` column to the task table showing:
- A badged icon indicating AI recommendation is available
- On hover, shows a tooltip with the top recommended employee
- Clicking opens the `AiRecommendationPanel`

### 3.4 Wire Up the Suitability API Call

**File:** `src/api.ts` (MODIFY) or create `src/services/aiService.ts` (NEW)

Add typed API functions for the AI endpoints:

```typescript
// aiService.ts
import api from '../api';

export const aiService = {
    getSuitability: (taskId: string) =>
        api.get<SuitabilityResponseDTO[]>(`/api/tasks/${taskId}/suitability`),

    getSuitabilityExplanation: (taskId: string, employeeId: string) =>
        api.get<SuitabilityExplanationDTO>(`/api/tasks/${taskId}/suitability/${employeeId}/explain`),

    getSlaRisk: (taskId: string) =>
        api.get<SlaRiskResponseDTO>(`/api/tasks/${taskId}/sla-risk`),

    getSlaRiskExplanation: (taskId: string) =>
        api.get<SlaRiskExplanationDTO>(`/api/tasks/${taskId}/sla-risk/explain`),
};
```

### 3.5 Dependency Map

```
AiRecommendationPanel (NEW)
├── aiService.getSuitability(taskId)
├── aiService.getSuitabilityExplanation(taskId, empId)
├── aiService.getSlaRisk(taskId)
└── (fully self-contained, no imports from task creation code)

TaskView.tsx (MODIFY)
└── imports AiRecommendationPanel → renders in "AI Insights" tab

TaskManager.tsx (MODIFY)
└── imports AiRecommendationPanel → renders on click/hover
```

### 3.6 No Changes Required To

| File | Reason |
|------|--------|
| `OpAdmin_Dashboard.tsx` | Task creation flow stays untouched |
| `AIAssignmentView.tsx` | Already separated |
| `SystemAdmin_Dashboard.tsx` | Task creation stays untouched |
| Task API payloads | No new fields added |
| Task creation validation | No new required fields |

---

## Task 4 — Ensure Decoupling (AI is Optional)

### Design Principle

The AI recommendation feature must **never prevent** task creation or assignment from working. This is enforced by:

### 4.1 Component-Level Isolation
- `AiRecommendationPanel` is a **presentational component** that fetches its own data
- It accepts an **optional** `taskId` prop — if `undefined`, it renders nothing
- It silently handles errors — if the API fails (network error, 403, 500), it shows a subtle error state, not a crash
- No loading state blocks the parent component

### 4.2 Error Handling Contract
```typescript
// All AI API failures are handled internally
try {
    const result = await aiService.getSuitability(taskId);
    // ... update local state
} catch (error) {
    // Set error state — component shows "AI unavailable" message
    // No exception propagates to parent
    setError('AI recommendation temporarily unavailable');
}
```

### 4.3 Feature Flag Ready
The `AiRecommendationPanel` can be toggled off entirely via a simple prop or environment variable:
```typescript
// In the parent: simply don't render the component
// When AI is disabled:
{/* <AiRecommendationPanel taskId={task.id} /> — commented out */}
```

### 4.4 Task Creation Flow — Unchanged
```
With AI enabled:                              Without AI:
1. User fills form                            1. User fills form
2. POST /api/Task                             2. POST /api/Task
3. Task created + assigned                    3. Task created + assigned
4. User optionally views AI Insights tab      4. (AI Insights tab not rendered)
   → sees suitability rankings                 → feature simply absent
   → sees SLA risk prediction
5. User MAY re-assign based on AI suggestion
```

---

## Summary of Files to Create/Modify

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `src/services/aiService.ts` | Typed API client for AI endpoints |
| 2 | `src/components/AiRecommendationPanel/AiRecommendationPanel.tsx` | Standalone AI recommendation UI |
| 3 | `src/components/AiRecommendationPanel/AiRecommendationPanel.css` | Component styles |

### Modified Files

| # | File | Change |
|---|------|--------|
| 4 | `src/components/TaskView/TaskView.tsx` | Add "AI Insights" tab with AiRecommendationPanel |
| 5 | `src/components/TaskManager/TaskManager.tsx` | Add AI column/badge to task list |

### Unchanged Files (intentionally)

| File | Reason |
|------|--------|
| `OpAdmin_Dashboard.tsx` | Task creation flow untouched |
| `SystemAdmin_Dashboard.tsx` | Task creation flow untouched |
| `AIAssignmentView.tsx` | Already separated |
| `main.tsx` | No routing changes needed |
| `api.ts` | No core API changes needed |

---

## Implementation Order

1. Create `src/services/aiService.ts` — adds the typed API functions
2. Create `AiRecommendationPanel` component with CSS
3. Modify `TaskView.tsx` — add the AI Insights tab
4. Modify `TaskManager.tsx` — add AI column/badge
5. Test — verify task creation still works with and without the AI panel rendered
