# STARS ML Training Data

Exported on 2026-07-29 from `refactoring/bug-fix` branch.

## Contents

| File | Size | Description |
|---|---|---|
| `sla-risk-model.zip` | 38,793 bytes | ML.NET FastTree binary classification model (100 trees, 20 leaves) trained on completed + cancelled tasks |
| `training-tasks.csv` | 62,839 bytes | 299 tasks with features: PriorityLevel, Classification, Status, IsApproved (label), SlaRiskLevel, assigned_employee_count, has_multiple_assignments |
| `training-assignments.csv` | 61,922 bytes | 439 task-to-employee assignments |
| `training-recommendations.csv` | 14,725 bytes | 65 employee recommendations with category scores |
| `training-users.csv` | 966 bytes | 9 seed users with role and department |

## ML Features

The model uses 5 features:
- `PriorityLevel` (0=Low, 1=Medium, 2=High, 3=Urgent)
- `Classification` (0=RoutineDailyTask, 1=SpecialTask)
- `DepartmentWorkload` (active tasks in department at prediction time)
- `AssignedEmployeeCount` (number of employees assigned)
- `HasMultipleAssignments` (1 if more than one employee)

Label: `IsApproved = false` or deadline breached = overdue (True).

## How to Load on Another Machine

### Option 1: Train from CSV
```csharp
// Use ML.NET to load CSV and train
var mlContext = new MLContext();
var data = mlContext.Data.LoadFromTextFile<SlaRiskTrainingData>(
    "training-tasks.csv", separatorChar: ',', hasHeader: true);
```

### Option 2: Load the Pre-Trained Model
```csharp
var mlContext = new MLContext();
var model = mlContext.Model.Load("sla-risk-model.zip", out _);
var engine = mlContext.Model
    .CreatePredictionEngine<SlaRiskInput, SlaRiskOutput>(model);
```
