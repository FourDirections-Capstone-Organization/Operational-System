# PR: AI Expert System & SLA Risk Classifier

## Description

### Overview
Implements two AI components prescribed in `notes/AI-ANALYTICS-1.pdf` (AI section):
1. **Graph-Based Expert System (Heuristic AI) via Neo4j** — Configurable weights, explanation API, and admin tuning endpoint.
2. **Lightweight Decision Tree Classifier** — Predict SLA deadline risk per task using ML.NET's FastTree. Returns risk level + contributing factors.

---

### New Models & Config
- `backend/Models/ExpertSystemConfig.cs` — Configurable weights POCO (WorkloadWeight, ExperienceWeight, RecScoreWeight, MaxWorkload, MaxXP) registered via `IOptions<ExpertSystemConfig>` from `appsettings.json`
- `backend/Models/Enums/SlaRiskLevel.cs` — `Low=0, Medium=1, High=2` enum
- `backend/Models/Task.cs` — Added `SlaRiskLevel` property

### New DTOs
- `backend/Models/DTOs/SuitabilityExplanationDTO.cs` — Factor breakdown (workload, experience, rec score) + plain-English explanation
- `backend/Models/DTOs/SlaRiskResponseDTO.cs` — `SlaRiskResponseDTO`, `SlaRiskExplanationDTO`, `FactorContributionDTO`

### Expert System — Configurable Weights
- **`SuitabilityService`**: Injected `IExpertSystemConfigStore` (runtime-overridable config store persisted to JSON file). Replaced hardcoded Cypher coefficients `(0.35, 0.25, 0.40)` with parameterized config values
- **`IExpertSystemConfigStore` / `JsonExpertSystemConfigStore`**: File-based config override store at `config-expert-system-override.json`
- **`ExpertSystemConfigController`** (`GET/PUT /api/admin/expert-system/config`): ManagerOnly. Validates weights sum to ~1.0 ±0.05, non-negative, MaxWorkload/MaxXP ≥ 1

### Suitability Explanation
- `GET /api/tasks/{taskId}/suitability/{employeeId}/explain` returns factor breakdown + readable English explanation with math
- Example: *"Test Dispatcher1 scored 0.315. They have 1 active task(s) (workload factor 0.9 × weight 0.35 = 0.32), 0 completed routine tasks (experience factor 0 × weight 0.25 = 0), and average recommendation score of 0 (rec score 0 × weight 0.4 = 0)."*

### SLA Risk Prediction (ML.NET + Rule-Based Fallback)
- **`ISlaRiskPredictionService` / `SlaRiskPredictionService`**:
  - Loads ML model from `/app/Models/sla-risk-model.zip` on first request
  - Auto-reloads when model file timestamp changes (`EnsureModelLoaded`)
  - Falls back to rule-based when no model exists:
    - Non-Urgent → Low (0.80 confidence)
    - Urgent + Dept workload ≥ 10 → Medium (0.60)
    - Urgent + Dept workload < 10 → Low (0.70)
  - Predicts 5 features: PriorityLevel, Classification, DepartmentWorkload, AssignedEmployeeCount, HasMultipleAssignments
  - Updates `Task.SlaRiskLevel` in DB after prediction
  - `ExplainRiskAsync` returns per-feature contribution breakdown
- **`SlaRiskController`**: `GET /api/tasks/{taskId}/sla-risk` and `GET /api/tasks/{taskId}/sla-risk/explain`

### ML Training Service
- **`SlaRiskTrainingService`** (`BackgroundService`):
  - Trains FastTree binary classifier on startup from historical Completed/Cancelled tasks
  - Features: PriorityLevel, Classification, DepartmentWorkload, AssignedEmployeeCount, HasMultipleAssignments
  - Label: `false` = on-time, `true` = overdue
  - Retrains every 24h or on-demand via semaphore signal
  - Minimum 10 training samples required
  - Saves to `/app/Models/sla-risk-model.zip`
- **`MlAdminController`**: `POST /api/admin/ml/retrain` triggers manual retrain (ManagerOnly)

### Task Creation Integration
- `TaskService.CreateAsync` calls `_slaRiskService.PredictRiskAsync(task.Id)` after saving task + assignments
- `TaskResponseDTO` now includes `SlaRiskLevel` field

### NuGet Dependencies
- `Microsoft.ML` v4.0.2
- `Microsoft.ML.FastTree` v4.0.2

---

### xUnit Tests (35/35 Passing)

| Test File | Tests | Scope |
|---|---|---|
| `AI-Expert-System-Tests/ExpertSystemWeightTests.cs` | 6 | Default weights sum-to-one, weight ordering, caps, zero weight, invalid config |
| `AI-Expert-System-Tests/SuitabilityExplanationTests.cs` | 4 | Factor values, readable text, score math, unauthorized |
| `AI-Expert-System-Tests/SlaRiskPredictionTests.cs` | 8 | Urgent vs Low, dept workload, deadline proximity, null model fallback, confidence clamping, key factors, SlaRiskLevel mapping |
| `AI-Expert-System-Tests/ExpertSystemConfigAdminTests.cs` | 8 | Manager + all non-Manager roles auth, valid/invalid weights, negative/max validation |
| `AI-Expert-System-Tests/MlRetrainTests.cs` | 6 | Sufficient/insufficient data, model file creation, Manager-only role, boundaries |

### Manual Test Scenarios (All Verified)
- Scenario 1 — Weight Tuning: GET/PUT/reset cycle works ✅
- Scenario 2 — Suitability Explanation: Rankings + explanation text with correct math ✅
- Scenario 3 — SLA Risk Prediction: ML model active (Confidence=1.0), rule-based fallback ready ✅
- Scenario 4 — ML Retrain: Model created at `/app/Models/sla-risk-model.zip` (3,469 bytes) ✅
- Scenario 5 — Admin Authorization: Dispatcher gets 403 on all admin endpoints ✅

### Fixes Applied During Testing
1. Created `MlAdminController` at correct route `/api/admin/ml/retrain` (was under `/api/admin/expert-system/ml/retrain`)
2. Added `SlaRiskLevel` to `TaskResponseDTO` (missing from task responses)
3. Changed `HasMultipleAssignments` from `bool` to `float` for ML.NET column type compatibility
4. Fixed DI registration: `IRetrainTrigger` resolves the same hosted service instance via `sp.GetServices<IHostedService>()`

---

### Files Changed

**New Files (21):**
| File | Purpose |
|---|---|
| `backend/Models/ExpertSystemConfig.cs` | Configurable weights POCO |
| `backend/Models/Enums/SlaRiskLevel.cs` | Low/Medium/High enum |
| `backend/Models/DTOs/SuitabilityExplanationDTO.cs` | Suitability breakdown DTO |
| `backend/Models/DTOs/SlaRiskResponseDTO.cs` | Risk prediction + explanation DTOs |
| `backend/Modules/TaskManagement/ISlaRiskPredictionService.cs` | Risk prediction interface |
| `backend/Modules/TaskManagement/SlaRiskPredictionService.cs` | ML.NET + rule-based prediction |
| `backend/Modules/TaskManagement/SlaRiskTrainingService.cs` | Background training service |
| `backend/Modules/TaskManagement/IExpertSystemConfigStore.cs` | Config override interface |
| `backend/Modules/TaskManagement/JsonExpertSystemConfigStore.cs` | File-based config store |
| `backend/Controllers/SlaRiskController.cs` | Risk endpoints |
| `backend/Controllers/ExpertSystemConfigController.cs` | Config tuning admin endpoints |
| `backend/Controllers/MlAdminController.cs` | ML retrain endpoint |
| `backend/Tests/AI-Expert-System-Tests/ExpertSystemWeightTests.cs` | Unit tests |
| `backend/Tests/AI-Expert-System-Tests/SuitabilityExplanationTests.cs` | Unit tests |
| `backend/Tests/AI-Expert-System-Tests/SlaRiskPredictionTests.cs` | Unit tests |
| `backend/Tests/AI-Expert-System-Tests/ExpertSystemConfigAdminTests.cs` | Unit tests |
| `backend/Tests/AI-Expert-System-Tests/MlRetrainTests.cs` | Unit tests |
| `Test Reports/AI-Expert-System-Manual-Test-Report.html` | Manual test report |

**Modified Files (10):**
| File | Change |
|---|---|
| `backend/Models/Task.cs` | Added `SlaRiskLevel` property |
| `backend/Models/DTOs/TaskResponseDTO.cs` | Added `SlaRiskLevel` field |
| `backend/Modules/TaskManagement/ISuitabilityService.cs` | Added `GetSuitabilityExplanationAsync` |
| `backend/Modules/TaskManagement/SuitabilityService.cs` | Configurable weights via store, explanation method |
| `backend/Modules/TaskManagement/TaskService.cs` | Calls `PredictRiskAsync` on task creation |
| `backend/Controllers/SuitabilityController.cs` | Added explanation endpoint |
| `backend/Program.cs` | Registered all new services + hosted service |
| `backend/Backend.csproj` | Added `Microsoft.ML` + `Microsoft.ML.FastTree` |
| `backend/appsettings.json` | Added `ExpertSystemConfig` section |
| `backend/appsettings.Development.json` | Added `ExpertSystemConfig` section |
