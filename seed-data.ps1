# STARS Seed Data Script
# Run this after logging in as Manager to populate departments and positions

$baseUrl = "http://localhost:5173"

# Get auth token (reads from dev server localStorage via a prompt)
$token = Read-Host "Enter your authToken (open DevTools > Application > Local Storage > authToken)"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "=== Creating Departments ===" -ForegroundColor Cyan

$departments = @(
    @{ name = "Coordinator and Customer Service Team"; description = "Handles customer coordination and service operations" },
    @{ name = "Dispatch Team"; description = "Manages dispatch operations and logistics" },
    @{ name = "Forwarding and Delivery Team"; description = "Handles forwarding and delivery operations" },
    @{ name = "Accounting Team"; description = "Manages financial and accounting operations" }
)

$deptIds = @{}
foreach ($dept in $departments) {
    try {
        $res = Invoke-RestMethod -Uri "$baseUrl/api/department" -Method Post -Headers $headers -Body ($dept | ConvertTo-Json)
        $id = $res.data.id ?? $res.data.departmentId
        $deptIds[$dept.name] = $id
        Write-Host "  Created department: $($dept.name)" -ForegroundColor Green
    } catch {
        Write-Host "  Department '$($dept.name)' may already exist or error: $_" -ForegroundColor Yellow
    }
}

# If POST failed, try GET to get existing IDs
if ($deptIds.Count -eq 0) {
    Write-Host "Fetching existing departments..." -ForegroundColor Cyan
    $existing = Invoke-RestMethod -Uri "$baseUrl/api/department" -Method Get -Headers $headers
    $deptList = if ($existing.data) { $existing.data } elseif ($existing -is [System.Array]) { $existing } else { @() }
    foreach ($d in $deptList) {
        $deptIds[$d.name] = $d.departmentId ?? $d.id
    }
}

Write-Host "`n=== Creating Positions ===" -ForegroundColor Cyan

$positions = @(
    @{ name = "Operational Manager"; departmentName = "Dispatch Team" },
    @{ name = "Operational Admin"; departmentName = "Dispatch Team" },
    @{ name = "Operational Team"; departmentName = "Dispatch Team" },
    @{ name = "Finance Manager"; departmentName = "Accounting Team" },
    @{ name = "Head Accountant"; departmentName = "Accounting Team" },
    @{ name = "Accountant"; departmentName = "Accounting Team" },
    @{ name = "Assistant of Finance Manager"; departmentName = "Accounting Team" }
)

foreach ($pos in $positions) {
    $deptId = $deptIds[$pos.departmentName]
    if (-not $deptId) {
        Write-Host "  Skipping '$($pos.name)': department '$($pos.departmentName)' not found" -ForegroundColor Red
        continue
    }
    try {
        $body = @{ name = $pos.name; departmentId = $deptId } | ConvertTo-Json
        $null = Invoke-RestMethod -Uri "$baseUrl/api/job-positions" -Method Post -Headers $headers -Body $body
        Write-Host "  Created position: $($pos.name) ($($pos.departmentName))" -ForegroundColor Green
    } catch {
        Write-Host "  Position '$($pos.name)' may already exist or error: $_" -ForegroundColor Yellow
    }
}

Write-Host "`nDone! Restart the backend to apply seeded defaults, or check the Role Management tab." -ForegroundColor Cyan
