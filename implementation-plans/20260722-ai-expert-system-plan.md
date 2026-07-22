# AI Module Implementation Plan — Expert System & SLA Risk Classifier

> **Source:** `notes/AI-ANALYTICS-1.pdf` — AI section only (page 1)  
> **Branch:** `backend/feature/neo4j` or new feature branch  
> **Stack:** .NET 9, Neo4j, ML.NET, xUnit  

---

## 1. Goal

Implement the two AI components prescribed in the PDF:

1. **Graph-Based Expert System (Heuristic AI) via Neo4j** — Enhance the existing `SuitabilityService` with configurable weights, an explanation API, and an admin tuning endpoint.
2. **Lightweight Decision Tree Classifier** — Predict SLA deadline risk per task using ML.NET's FastTree (interpretable, not black-box). Return a risk level + contributing factors.

The Analytics section (ksqlDB stream processing, nightly batch) is **out of scope** for this plan.

---

## 2. Current State (From Codebase Audit)

| Aspect | Status |
|--------|--------|
| Neo4j graph with `Employee`, `Department`, `Task` nodes and `BELONGS_TO`, `ASSIGNED_TO`, `ASSIGNED_TO_DEPT` relationships | ✅ Populated by CDC Processor |
| `SuitabilityService` scoring query with Cypher | ✅ Exists, but weights are **hardcoded** (`0.35`, `0.25`, `0.40`, `maxWorkload=10`, `maxXP=20`) |
| `GET /api/tasks/{taskId}/suitability` endpoint | ✅ Returns top 5 ranked employees |
| Suitability explanation ("why this employee?") | ❌ Not implemented |
| Admin tuning of expert system weights | ❌ Not implemented |
| SLA risk prediction | ❌ Not implemented (SLA is purely rule-based: Urgent = 24h lock) |
| `OverdueCheckService` for deadline monitoring | ✅ Exists (runs every 15 min) |
| Recommendation system | ✅ Exists (manual entry only, Coordinator+) |
| ML.NET or any ML library | ❌ Not referenced in project |

---

## 3. Design Decisions

### 3.1 Expert System Weight Configuration

- Stored in `appsettings.json` under section `ExpertSystemConfig` (not in the database).
- Loaded at startup via `IOptions<ExpertSystemConfig>` so weights can be changed by restarting the container.
- A future enhancement (out of scope here) could persist overrides in the DB with a background config watcher.

### 3.2 Decision Tree Technology

- **ML.NET** with `FastTree` (a decision tree ensemble). Reasons:
  - Ships as a NuGet package (`Microsoft.ML`) — no new runtime or service needed.
  - `FastTree` is interpretable: feature contributions can be extracted for explanations.
  - Trained on historical task data from PostgreSQL (completed tasks with on-time/late status).
  - Retrained periodically (e.g., every 24h or on-demand) via a background hosted service.

### 3.3 Risk Prediction Context

- Prediction runs **at task creation time** and is stored on the `Task` entity as a new column (`SlaRiskLevel`).
- The Coordinator sees the risk level in the task creation form and when viewing task details.
- The `OverdueCheckService` can later use risk level to prioritize escalation (out of scope here, but the data model supports it).

### 3.4 Authorization

| Endpoint | Policy | Rationale |
|----------|--------|-----------|
| `GET .../suitability` | `CoordinatorAndAbove` | Existing |
| `GET .../suitability/{id}/explain` | `CoordinatorAndAbove` | Same as suitability |
| `GET .../sla-risk/{taskId}` | `CoordinatorAndAbove` | Managers/coordinators need to see risk |
| `GET /api/admin/expert-system/config` | `ManagerOnly` | Only managers tune the system |
| `PUT /api/admin/expert-system/config` | `ManagerOnly` | Only managers tune the system |
| `POST /api/admin/ml/retrain` | `ManagerOnly` | Trigger model retraining |

---

## 4. Implementation Tasks (Ordered)

### Task 1 — Create `ExpertSystemConfig` Model

**File:** `backend/Models/ExpertSystemConfig.cs` (NEW)

```csharp
namespace Backend.Models;

public class ExpertSystemConfig
{
    public double WorkloadWeight { get; set; } = 0.35;
    public double ExperienceWeight { get; set; } = 0.25;
    public double RecScoreWeight { get; set; } = 0.40;
    public int MaxWorkload { get; set; } = 10;
    public int MaxXP { get; set; } = 20;
}
```

**Register in `Program.cs`** (line ~114, after `Neo4jSettings`):
```csharp
builder.Services.Configure<ExpertSystemConfig>(builder.Configuration.GetSection("ExpertSystemConfig"));
```

**Add to `appsettings.json`** and `appsettings.Development.json`:
```json
"ExpertSystemConfig": {
  "WorkloadWeight": 0.35,
  "ExperienceWeight": 0.25,
  "RecScoreWeight": 0.40,
  "MaxWorkload": 10,
  "MaxXP": 20
}
```

### Task 2 — Create `SuitabilityExplanationDTO`

**File:** `backend/Models/DTOs/SuitabilityExplanationDTO.cs` (NEW)

```csharp
namespace Backend.Models.DTOs;

public class SuitabilityExplanationDTO
{
    public Guid EmployeeId { get; set; }
    public string EmployeeNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public double FinalScore { get; set; }

    // Factor breakdown
    public double WorkloadFactor { get; set; }
    public double WorkloadWeight { get; set; }
    public double ExperienceFactor { get; set; }
    public double ExperienceWeight { get; set; }
    public double RecScore { get; set; }
    public double RecScoreWeight { get; set; }

    // Plain-English explanation
    public string Explanation { get; set; } = string.Empty;
}
```

### Task 3 — Create `SlaRiskLevel` Enum

**File:** `backend/Models/Enums/SlaRiskLevel.cs` (NEW)

```csharp
namespace Backend.Models.Enums;

public enum SlaRiskLevel
{
    Low = 0,
    Medium = 1,
    High = 2
}
```

### Task 4 — Add `SlaRiskLevel` to `Task` Model

**File:** `backend/Models/Task.cs` — add property after `IsSLALocked` (line 29):

```csharp
public SlaRiskLevel SlaRiskLevel { get; set; } = SlaRiskLevel.Low;
```

**Note:** This adds a new column to the `Tasks` table. `EnsureCreated()` handles the migration automatically for development. For production, a proper EF Core migration would be needed.

### Task 5 — Create `SlaRiskResponseDTO` and `SlaRiskExplanationDTO`

**File:** `backend/Models/DTOs/SlaRiskResponseDTO.cs` (NEW)

```csharp
namespace Backend.Models.DTOs;

public class SlaRiskResponseDTO
{
    public Guid TaskId { get; set; }
    public string RiskLevel { get; set; } = "Low";
    public double ConfidenceScore { get; set; }
    public List<string> KeyFactors { get; set; } = new();
}

public class SlaRiskExplanationDTO
{
    public Guid TaskId { get; set; }
    public string RiskLevel { get; set; } = "Low";
    public double ConfidenceScore { get; set; }
    public List<FactorContributionDTO> FeatureContributions { get; set; } = new();
}

public class FactorContributionDTO
{
    public string FeatureName { get; set; } = string.Empty;
    public double Value { get; set; }
    public double Contribution { get; set; }
    public string Description { get; set; } = string.Empty;
}
```

### Task 6 — Modify `SuitabilityService` to Accept Configurable Weights

**File:** `backend/Modules/TaskManagement/SuitabilityService.cs` (MODIFY)

Changes:
1. Inject `IOptions<ExpertSystemConfig>` alongside existing dependencies.
2. Replace hardcoded `0.35`, `0.25`, `0.40`, `maxWorkload=10`, `maxXP=20` with `_config.Value.WorkloadWeight`, etc.
3. Add a new method `GetSuitabilityExplanationAsync(...)` that returns `ApiResponseDTO<List<SuitabilityExplanationDTO>>`.
   - Runs the same Cypher query but also returns the factor breakdown.
   - Builds a plain-English explanation string like: *"John had the lowest workload (2 tasks, factor=0.80) and above-average recommendation score (0.72, factor=0.29), contributing to a final score of 0.7541."*

**File:** `backend/Modules/TaskManagement/ISuitabilityService.cs` (MODIFY)
- Add `GetSuitabilityExplanationAsync(Guid taskId, Guid employeeId, UserRole callerRole, Guid callerDepartmentId)`.

### Task 7 — Add Explanation Endpoint to Controller

**File:** `backend/Controllers/SuitabilityController.cs` (MODIFY)

Add:
```csharp
[HttpGet("tasks/{taskId:guid}/suitability/{employeeId:guid}/explain")]
[Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
public async Task<IActionResult> GetSuitabilityExplanation(Guid taskId, Guid employeeId)
{
    // Extract user claims, call service, return breakdown
}
```

### Task 8 — Add `Microsoft.ML` NuGet Package

**File:** `backend/Backend.csproj` (MODIFY)

Add:
```xml
<PackageReference Include="Microsoft.ML" Version="4.0.2" />
```

### Task 9 — Create `ISlaRiskPredictionService` and Implementation

**File:** `backend/Modules/TaskManagement/ISlaRiskPredictionService.cs` (NEW)

```csharp
namespace Backend.Modules.TaskManagement;

public interface ISlaRiskPredictionService
{
    Task<SlaRiskResponseDTO> PredictRiskAsync(Guid taskId);
    Task<SlaRiskExplanationDTO> ExplainRiskAsync(Guid taskId);
}
```

**File:** `backend/Modules/TaskManagement/SlaRiskPredictionService.cs` (NEW)

Key design:
- On first call, loads the ML model from `Models/sla-risk-model.zip` (relative to the app content root).
- If no model exists, returns a fallback rule-based risk (`Low` for non-Urgent, `Medium` for Urgent with high department workload).
- The `PredictRiskAsync` method:
  1. Loads the task from EF Core with its department and assignments.
  2. Builds a feature vector: `{Priority, Classification, DepartmentWorkload, EmployeeWorkload, TaskCountInDept, HourUntilDeadline, IsUrgent}`.
  3. Feeds it to the ML.NET prediction engine.
  4. Returns risk level + confidence.
  5. Updates the `Task.SlaRiskLevel` in the database.
- The `ExplainRiskAsync` method uses ML.NET's `FeatureContributionCalculator` to extract per-feature impact.

**Register in `Program.cs`:**
```csharp
builder.Services.AddScoped<ISlaRiskPredictionService, SlaRiskPredictionService>();
```

### Task 10 — Create `SlaRiskController`

**File:** `backend/Controllers/SlaRiskController.cs` (NEW)

```csharp
[ApiController]
[Route("api")]
[Authorize]
public class SlaRiskController : ControllerBase
{
    [HttpGet("tasks/{taskId:guid}/sla-risk")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetSlaRisk(Guid taskId) { ... }

    [HttpGet("tasks/{taskId:guid}/sla-risk/explain")]
    [Authorize(Policy = AuthorizationPolicies.CoordinatorAndAbove)]
    public async Task<IActionResult> GetSlaRiskExplanation(Guid taskId) { ... }
}
```

### Task 11 — Create `SlaRiskTrainingService` (Background)

**File:** `backend/Modules/TaskManagement/SlaRiskTrainingService.cs` (NEW)

- Inherits `BackgroundService`.
- On startup, trains the initial model from historical completed tasks.
  - Queries tasks with status `Completed` or `Cancelled`.
  - Labels: `0` = completed on time (before or on deadline), `1` = overdue (past deadline or `IsApproved == false`).
  - Features: `PriorityLevel`, `Classification`, `DepartmentWorkload` (at creation time), `AssignedEmployeeCount`, `HasMultipleAssignments`.
- Saves the trained model to `Models/sla-risk-model.zip`.
- Retrains every 24 hours (configurable interval).
- Exposes a manual retrain trigger via a singleton flag that the controller can set.

**Register in `Program.cs`:**
```csharp
builder.Services.AddHostedService<SlaRiskTrainingService>();
```

### Task 12 — Create `ExpertSystemConfigController`

**File:** `backend/Controllers/ExpertSystemConfigController.cs` (NEW)

```csharp
[ApiController]
[Route("api/admin/expert-system")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public class ExpertSystemConfigController : ControllerBase
{
    [HttpGet("config")]
    public IActionResult GetConfig() { ... }  // Returns current weight values

    [HttpPut("config")]
    public async Task<IActionResult> UpdateConfig([FromBody] ExpertSystemConfig newConfig) { ... }
    // Validates weights sum to ~1.0, saves to a config store (appsettings override file or DB)
}
```

### Task 13 — Integrate Risk Prediction at Task Creation

**File:** `backend/Modules/TaskManagement/TaskService.cs` (MODIFY)

In the `CreateAsync` method, after the task is saved to the database, call `_slaRiskService.PredictRiskAsync(newTask.Id)` to compute and store the initial risk level.

This ensures every new task gets a risk prediction immediately.

### Task 14 — Create Admin Retrain Endpoint

Add to `ExpertSystemConfigController` or create a separate `MlAdminController`:

```csharp
[HttpPost("ml/retrain")]
[Authorize(Policy = AuthorizationPolicies.ManagerOnly)]
public async Task<IActionResult> RetrainModel()
{
    await _trainingService.TriggerRetrainAsync();
    return Ok(ApiResponseDTO<string>.Success("Model retraining started"));
}
```

---

## 5. xUnit Tests

All tests follow the existing project pattern: helper method + `[Fact]` assertions.

### 5.1 Expert System Tests

**File:** `backend/Tests/TaskManagement/ExpertSystemWeightTests.cs` (NEW)

| Test | Description |
|------|-------------|
| `DefaultWeights_SumToOne` | Verifies default Workload+Experience+RecScore weights sum to 1.0 |
| `WeightChange_AffectsScoreOrdering` | Two employees with different profiles; increasing workload weight changes their rank |
| `MaxWorkload_CapsAtConfiguredValue` | Employee with workload > MaxWorkload gets workloadFactor=0 |
| `MaxXP_CapsExperienceAtConfiguredValue` | Employee with > MaxXP completed tasks gets capped experience factor |
| `ZeroWeight_DisablesFactor` | Setting workload weight to 0 removes it from the calculation |
| `InValidConfig_ThrowsOnSumNotCloseToOne` | Weights summing to != 1.0 (outside 0.05 tolerance) should be rejected |

### 5.2 Suitability Explanation Tests

**File:** `backend/Tests/TaskManagement/SuitabilityExplanationTests.cs` (NEW)

| Test | Description |
|------|-------------|
| `Explanation_IncludesAllFactorValues` | The returned DTO contains workload factor, experience factor, rec score |
| `Explanation_GeneratesReadableText` | The Explanation string contains the employee name, numerical values, and weights |
| `Explanation_ForTopEmployee_MatchesScore` | The final score in the explanation matches the suitability score |
| `Explanation_EmptyWhenNotAuthorized` | Non-Coordinator roles receive an empty/unavailable explanation |

### 5.3 SLA Risk Prediction Tests

**File:** `backend/Tests/TaskManagement/SlaRiskPredictionTests.cs` (NEW)

These tests use the **rule-based fallback** logic (when no ML model is loaded, which is the case in unit tests).

| Test | Description |
|------|-------------|
| `UrgentTask_HigherRiskThanLowPriority` | Feature vector comparison: urgent tasks score higher risk than low priority |
| `HighDepartmentWorkload_IncreasesRisk` | Department with many active tasks increases predicted risk |
| `TaskWithSufficientTime_LowRisk` | Deadline far in the future → Low risk |
| `TaskApproachingDeadline_HigherRisk` | Task due within 1 hour → Higher risk than same task due in 7 days |
| `NullModel_FallbackToRuleBased` | When `sla-risk-model.zip` doesn't exist, falls back to rule-based (Urgent=Medium, else Low) |
| `ConfidenceScore_IsBetweenZeroAndOne` | Confidence score is clamped to [0.0, 1.0] |
| `RiskExplanation_IncludesKeyFactors` | Explanation DTO contains at least one KeyFactor string |
| `RiskLevel_UpdatesOnTaskEntity` | After prediction, `Task.SlaRiskLevel` is set in the database (integration-only, mock the DB) |

### 5.4 Expert System Config Admin Tests

**File:** `backend/Tests/TaskManagement/ExpertSystemConfigAdminTests.cs` (NEW)

| Test | Description |
|------|-------------|
| `Manager_CanReadConfig` | Manager role is authorized for GET config |
| `Coordinator_CannotReadConfig` | Coordinator role is denied |
| `Manager_CanUpdateConfig_WithValidWeights` | Valid weight update (sum=1.0) succeeds |
| `Manager_CannotUpdateConfig_WithInvalidWeights` | Invalid weight update (sum != 1.0) returns validation error |
| `UpdateWeights_PersistsAcrossRequests` | (Integration) New weights are reflected in subsequent GET |

### 5.5 ML Retrain Tests

**File:** `backend/Tests/TaskManagement/MlRetrainTests.cs` (NEW)

| Test | Description |
|------|-------------|
| `Retrain_WithSufficientData_Succeeds` | When >= 50 historical tasks exist, retrain succeeds |
| `Retrain_WithInsufficientData_ReturnsWarning` | When < 10 historical tasks, returns a warning message |
| `Retrain_ModelFileCreated` | After retrain, `sla-risk-model.zip` exists |
| `Retrain_RequiresManagerRole` | Non-manager roles are denied |

---

## 6. Manual Testing Scenarios

Each scenario should be documented in `Test Reports/` following the existing `.html` report format.

### Scenario 1 — Expert System Weight Tuning

1. Login as Manager.
2. `GET /api/admin/expert-system/config` returns `{ workloadWeight: 0.35, experienceWeight: 0.25, recScoreWeight: 0.40, maxWorkload: 10, maxXP: 20 }`.
3. `PUT /api/admin/expert-system/config` with `{ workloadWeight: 0.50, experienceWeight: 0.20, recScoreWeight: 0.30 }`.
4. `GET /api/tasks/{id}/suitability` — verify the ranked list changed (employees with lower workload should rank higher).
5. Reset weights back to defaults.

### Scenario 2 — Suitability Explanation

1. Login as Coordinator.
2. `GET /api/tasks/{id}/suitability/{empId}/explain` returns:
   ```json
   {
     "employeeNumber": "DSP002",
     "fullName": "Maria Santos",
     "finalScore": 0.7541,
     "workloadFactor": 0.80,
     "workloadWeight": 0.35,
     "experienceFactor": 0.65,
     "experienceWeight": 0.25,
     "recScore": 0.72,
     "recScoreWeight": 0.40,
     "explanation": "Maria Santos scored 0.7541. She has 2 active tasks (workload factor 0.80 × weight 0.35 = 0.28), 13 completed special tasks (experience factor 0.65 × weight 0.25 = 0.16), and average recommendation score of 0.72 (rec score 0.72 × weight 0.40 = 0.29)."
   }
   ```
3. Verify the explanation text is readable and the math is correct.

### Scenario 3 — SLA Risk Prediction

1. Login as Coordinator.
2. Create a new task with Urgent priority, assigned to a department with high workload.
3. `GET /api/tasks/{newTaskId}/sla-risk` returns `High` risk.
4. Create another task with Low priority, deadline 7 days away, assigned to a light department.
5. `GET /api/tasks/{newTaskId2}/sla-risk` returns `Low` risk.
6. View the explanation: `GET /api/tasks/{id}/sla-risk/explain` — verify the key factors make sense.

### Scenario 4 — ML Model Retrain

1. Login as Manager (ensure sufficient completed tasks exist).
2. `POST /api/admin/ml/retrain` returns success.
3. Verify `sla-risk-model.zip` was created/updated.
4. Create a new task and verify risk prediction now uses the trained model (confidence > 0.5).

### Scenario 5 — Admin Authorization

1. Login as Dispatcher.
2. `GET /api/admin/expert-system/config` — returns 403 Forbidden.
3. `PUT /api/admin/expert-system/config` — returns 403 Forbidden.
4. `POST /api/admin/ml/retrain` — returns 403 Forbidden.

---

## 7. Data Flow Diagrams

### 7.1 Expert System Flow

```mermaid
flowchart LR
    C[Coordinator] -->|GET /tasks/{id}/suitability| SC[SuitabilityController]
    SC --> SS[SuitabilityService]
    SS -->|Cypher query| NEO[(Neo4j)]
    SS -.->|Reads weights| CFG[ExpertSystemConfig\nin IOptions]
    NEO -->|Ranked employees| SS
    SS -->|Top 5 + scores| SC
    SC -->|JSON response| C
    C -->|GET .../suitability/{empId}/explain| SC
    SC --> SS
    SS -->|Factor breakdown| SC
    SC -->|JSON explanation| C
    M[Manager] -->|GET/PUT<br/>/admin/expert-system/config| ADM[ExpertSystemConfigController]
    ADM -.->|Reads/updates| CFG
```

### 7.2 SLA Risk Prediction Flow

```mermaid
flowchart LR
    subgraph prediction["Request Flow — Risk Prediction"]
        CO[Coordinator] -->|Creates task| TS[TaskService.CreateAsync]
        TS -->|Saves task| PG[(PostgreSQL)]
        TS -->|PredictRiskAsync| SR[SlaRiskPredictionService]
        SR -.->|Loads model| MODEL[(sla-risk-model.zip)]
        SR -->|Sets SlaRiskLevel| PG
        CO -->|GET /tasks/{id}/sla-risk| RC[SlaRiskController]
        RC --> SR
        SR -->|RiskLevel + Confidence + Factors| RC
        RC -->|JSON response| CO
    end

    subgraph training["Background — Model Training"]
        BG[SlaRiskTrainingService\nIHostedService] -->|Queries completed tasks\nevery 24h| PG
        BG -->|Trains & saves| MODEL
    end
```

---

## 8. File Change Summary

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `backend/Models/ExpertSystemConfig.cs` | Configurable weights POCO |
| 2 | `backend/Models/DTOs/SuitabilityExplanationDTO.cs` | Suitability breakdown DTO |
| 3 | `backend/Models/Enums/SlaRiskLevel.cs` | Low/Medium/High enum |
| 4 | `backend/Models/DTOs/SlaRiskResponseDTO.cs` | Risk prediction response |
| 5 | `backend/Models/DTOs/FactorContributionDTO.cs` | ML feature contribution |
| 6 | `backend/Modules/TaskManagement/ISlaRiskPredictionService.cs` | Risk prediction interface |
| 7 | `backend/Modules/TaskManagement/SlaRiskPredictionService.cs` | ML.NET risk prediction impl |
| 8 | `backend/Controllers/SlaRiskController.cs` | Risk prediction endpoints |
| 9 | `backend/Modules/TaskManagement/SlaRiskTrainingService.cs` | Background model training |
| 10 | `backend/Controllers/ExpertSystemConfigController.cs` | Admin weight tuning endpoints |
| 11 | `backend/Tests/TaskManagement/ExpertSystemWeightTests.cs` | Unit tests for weight logic |
| 12 | `backend/Tests/TaskManagement/SuitabilityExplanationTests.cs` | Unit tests for explanation |
| 13 | `backend/Tests/TaskManagement/SlaRiskPredictionTests.cs` | Unit tests for risk prediction |
| 14 | `backend/Tests/TaskManagement/ExpertSystemConfigAdminTests.cs` | Unit tests for admin API |
| 15 | `backend/Tests/TaskManagement/MlRetrainTests.cs` | Unit tests for ML retrain |

### Modified Files

| # | File | Change |
|---|------|--------|
| 1 | `backend/Models/Task.cs` | Add `SlaRiskLevel` property |
| 2 | `backend/Models/DTOs/SuitabilityResponseDTO.cs` | (Optional) Add factor breakdown fields |
| 3 | `backend/Modules/TaskManagement/ISuitabilityService.cs` | Add explanation method |
| 4 | `backend/Modules/TaskManagement/SuitabilityService.cs` | Configurable weights + explanation query |
| 5 | `backend/Controllers/SuitabilityController.cs` | Add explanation endpoint |
| 6 | `backend/Modules/TaskManagement/TaskService.cs` | Call risk prediction on task creation |
| 7 | `backend/Program.cs` | Register new services, config, hosted service |
| 8 | `backend/Backend.csproj` | Add `Microsoft.ML` package |
| 9 | `backend/appsettings.json` | Add `ExpertSystemConfig` section |
| 10 | `backend/appsettings.Development.json` | Add `ExpertSystemConfig` section |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| ML model trained on insufficient data | Fallback to rule-based logic when < 10 historical tasks exist; `SlaRiskTrainingService` checks threshold before training |
| Expert system weights changed but unsuitable | `PUT` endpoint validates sum-to-one; old config can be restored; all changes are auditable |
| Neo4j performance with complex explanation queries | Explanation query adds minimal overhead (single additional read); can be cached if needed |
| ML.NET model format version incompatibility | Pin `Microsoft.ML` version; include model rebuild in startup if version mismatch detected |
| `EnsureCreated()` doesn't add `SlaRiskLevel` column to existing DB | Run `DROP TABLE Tasks` in dev (data is seed-only) or add manual migration SQL |

---

## 10. Success Criteria

- [ ] All 5 xUnit test files pass: `dotnet test backend/Tests/`
- [ ] Expert system weights are configurable via API and reflected in suitability scores
- [ ] Suitability explanation returns readable factor breakdown for any ranked employee
- [ ] SLA risk prediction returns a risk level for any existing task
- [ ] ML model trains from historical data and persists to disk
- [ ] Admin endpoints are protected by `ManagerOnly` policy
- [ ] Manual test scenarios pass and are documented in `Test Reports/`
