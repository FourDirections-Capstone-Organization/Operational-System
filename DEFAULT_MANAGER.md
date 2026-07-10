# Seeded Accounts

> **WARNING: Test accounts are for development/testing only. Remove them before deploying to production.**

## Purpose

Default accounts are automatically seeded when the application starts for the first time. These allow immediate access to all endpoints for testing purposes without needing to manually create users.

---

## Manager Account (Production)

**Email:** `manager@stars.com`  
**Employee Number:** `MGR001`  
**Temporary Password:** `Manager@2024!Temp`

| Property | Value |
|----------|-------|
| Role | Manager |
| Name | System Manager |
| Department | None |
| Email Verified | Yes |
| Password Changed | No |

---

## Test Accounts (FOR TESTING ONLY - REMOVE FOR PRODUCTION)

**Common Password for all test accounts:** `Test@2024!Pass`

### Coordinators (2)

| Email | Employee Number | Name | Department |
|-------|-----------------|------|------------|
| `coordinator1@stars.com` | `CRD001` | Test Coordinator1 | Coordinator & Customer Service Team |
| `coordinator2@stars.com` | `CRD002` | Test Coordinator2 | Dispatch Team |

### Dispatchers (2)

| Email | Employee Number | Name | Department |
|-------|-----------------|------|------------|
| `dispatcher1@stars.com` | `DSP001` | Test Dispatcher1 | Dispatch Team |
| `dispatcher2@stars.com` | `DSP002` | Test Dispatcher2 | Dispatch Team |

### Encoders (2)

| Email | Employee Number | Name | Department |
|-------|-----------------|------|------------|
| `encoder1@stars.com` | `ENC001` | Test Encoder1 | Forwarding Team (Vismin Airline Cargo Forwarders) |
| `encoder2@stars.com` | `ENC002` | Test Encoder2 | Forwarding Team (Vismin Airline Cargo Forwarders) |

### Couriers (2)

| Email | Employee Number | Name | Department |
|-------|-----------------|------|------------|
| `courier1@stars.com` | `CRS001` | Test Courier1 | Dispatch Team |
| `courier2@stars.com` | `CRS002` | Test Courier2 | Forwarding Team (Vismin Airline Cargo Forwarders) |

---

## How It Works

1. When the application starts, it checks if seeded accounts already exist
2. If not found, it creates them with the credentials above
3. All accounts are created with `IsEmailVerified = true` (can login immediately)
4. All accounts are created with `IsPasswordChanged = false` (will be prompted to change on first login)
5. The seeding is idempotent - running the application multiple times won't create duplicates

---

## First Login Flow

1. Login using the credentials above
2. The system will detect `IsPasswordChanged = false`
3. You'll be prompted to change your password
4. After changing the password, you'll have full access based on your role

---

## Notes

- Test accounts are distributed across departments for testing task visibility and assignment features
- The temporary password follows OWASP compliance rules (15+ characters, mixed case, numbers, special characters)
- **To remove test accounts for production:**
  1. Remove the `SeedTestAccountsAsync()` call from `Program.cs`
  2. Optionally remove the `SeedTestAccountsAsync()` method from `UserService.cs`
  3. Delete the test accounts from the database if they already exist
