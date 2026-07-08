# STARS Module 1 - Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for **Module 1: User Identity, Access Control & Organizational Structure** of the Speedex Task Allocation & Review System (STARS).

**Tech Stack:**
- **Backend:** ASP.NET Core 9.0, Entity Framework Core, PostgreSQL
- **Pattern:** Controller → Service (Interface) → DbContext
- **Auth:** JWT (JSON Web Tokens) with role-based claims

---

## Module Structure

Module 1 is divided into **4 sub-modules** with **16 Functional Requirements (FRs)**:

| Sub-Module | FRs Covered | Focus Area |
|------------|-------------|------------|
| 1.1 User Account Management | FR-001 to FR-005 | Creating, editing, deactivating user accounts |
| 1.2 Authentication & Credentials | FR-006 to FR-008 | Login, password reset, session timeout |
| 1.3 Role-Based Access Control (RBAC) | FR-009 to FR-013 | Role enforcement, task visibility, permissions |
| 1.4 Organizational Structure | FR-014 to FR-016 | Departments, hierarchy, transfers |

---

## Implementation Order

The sub-modules should be implemented in this order because each one builds on the previous:

```
1.4 Organizational Structure  ← Build first (departments/roles are needed by everything)
    ↓
1.1 User Account Management   ← Build second (needs departments/roles to create users)
    ↓
1.2 Authentication & Credentials  ← Build third (needs user accounts to exist)
    ↓
1.3 Role-Based Access Control     ← Build last (needs auth + users + org structure)
```

---

## Detailed Breakdown

### Phase 1: Sub-Module 1.4 - Organizational Structure (FR-014 to FR-016)

**Why first?** Departments and job positions are referenced by user accounts. We need these to exist before we can create users.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-014 | Corporate Hierarchy Mapping | `Department` model, `JobPosition` model, hierarchy relationships |
| FR-015 | Department Groupings | Department CRUD endpoints, seed 3 default departments |
| FR-016 | Department Transfers | Transfer endpoint, update user's department/position |

**Backend Files to Create:**
- `Models/Department.cs`
- `Models/JobPosition.cs`
- `Services/IDepartmentService.cs`
- `Services/DepartmentService.cs`
- `Controllers/DepartmentController.cs`
- Update `Data/AppDbContext.cs` with new DbSets

**Key Concepts:**
- One-to-Many relationships (Department → JobPositions, Department → Users)
- Seed data for default departments
- Soft delete pattern (IsActive flag)

---

### Phase 2: Sub-Module 1.1 - User Account Management (FR-001 to FR-005)

**Why second?** Now that departments exist, we can create user accounts linked to them.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-001 | User Account Creation | `User` model, registration endpoint with all fields |
| FR-002 | Secure Password Delivery | Auto-generate temp password, SMTP email service |
| FR-003 | User Profile Editing | Update endpoint for contact info (Manager + Owner) |
| FR-004 | Deactivation & Data Privacy | Soft delete, block login, preserve historical data |
| FR-005 | Account Activation Control | Reactivation endpoint |

**Backend Files to Create:**
- `Models/User.cs`
- `Models/DTOs/RegisterUserDTO.cs`
- `Models/DTOs/UpdateUserDTO.cs`
- `Services/IUserService.cs`
- `Services/UserService.cs`
- `Services/IEmailService.cs`
- `Services/EmailService.cs` (SMTP implementation)
- `Controllers/UserController.cs`
- Update `Data/AppDbContext.cs`

**Key Concepts:**
- Password hashing with PBKDF2 (ASP.NET Core built-in PasswordHasher<T>)
- OWASP password requirements (min 15 chars, uppercase, lowercase, number, special character)
- SMTP email sending (MailKit library)
- Soft delete (IsActive/IsDeactivated flags)
- Data archival (read-only historical data)

**NuGet Packages Needed:**
- `MailKit` (SMTP email)

*(No external password hashing package needed - ASP.NET Core's built-in `PasswordHasher<T>` implements PBKDF2)*

---

### Phase 3: Sub-Module 1.2 - Authentication & Credentials (FR-006 to FR-008)

**Why third?** Authentication needs user accounts to exist first.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-006 | Multi-Credential Login | Login with Employee ID, Email, or Username |
| FR-007 | Password Reset Self-Service | Generate reset token, email link, reset endpoint |
| FR-008 | Inactivity Session Timeout | JWT expiry + middleware to track last activity |

**Backend Files to Create:**
- `Models/DTOs/LoginDTO.cs`
- `Models/DTOs/ResetPasswordDTO.cs`
- `Services/IAuthService.cs`
- `Services/AuthService.cs`
- `Controllers/AuthController.cs`
- `Middleware/SessionTimeoutMiddleware.cs`
- Update `Program.cs` to register JWT auth

**Key Concepts:**
- JWT (JSON Web Tokens) for stateless auth
- Token generation with role claims
- Refresh tokens for session management
- Sliding expiration for inactivity timeout

**NuGet Packages Needed:**
- `Microsoft.AspNetCore.Authentication.JwtBearer`
- `System.IdentityModel.Tokens.Jwt`

---

### Phase 4: Sub-Module 1.3 - Role-Based Access Control (FR-009 to FR-013)

**Why last?** RBAC needs auth + users + org structure all in place.

| FR ID | Requirement | What We'll Build |
|-------|-------------|------------------|
| FR-009 | Client Role Enforcement | Define roles: Manager, Coordinator, Dispatcher, Encoder, Courier |
| FR-010 | Assigned Task Visibility | Filter tasks by assignee for standard roles |
| FR-011 | Coordinator Management Scoping | Coordinators see tasks in their assigned accounts |
| FR-012 | Manager Dashboard Access | Manager sees everything (full access) |
| FR-013 | Confidential Task Visibility | Confidential flag on tasks, filter by role |

**Backend Files to Create:**
- `Models/Enums/UserRole.cs` (enum for roles)
- `Models/Enums/TaskVisibility.cs`
- `Services/IRoleService.cs`
- `Services/RoleService.cs`
- `Controllers/RoleController.cs`
- `Filters/TaskVisibilityFilter.cs` (for query filtering)
- Update `Program.cs` with authorization policies

**Key Concepts:**
- Authorization policies (role-based)
- Claim-based access control
- Query filters (EF Core global filters)
- Policy-based authorization

---

## Database Schema Overview

After Module 1, the database will have these tables:

```
┌─────────────────┐       ┌─────────────────┐
│   Department    │       │   JobPosition   │
├─────────────────┤       ├─────────────────┤
│ Id (PK)         │◄──────│ Id (PK)         │
│ Name            │       │ Name            │
│ Description     │       │ DepartmentId(FK)│
│ IsActive        │       │ IsActive        │
└─────────────────┘       └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────────────────────┐
│                  User                   │
├─────────────────────────────────────────┤
│ Id (PK)                                 │
│ EmployeeNumber (Unique)                 │
│ Username (Unique)                       │
│ Email (Unique)                          │
│ PasswordHash                            │
│ FirstName, MiddleName, LastName, Suffix │
│ ContactNumber                           │
│ Role (Enum)                             │
│ DepartmentId (FK)                       │
│ JobPositionId (FK)                      │
│ IsActive                                │
│ IsDeactivated                           │
│ IsEmailVerified                         │
│ IsPasswordChanged                       │
│ LastActivityAt                          │
│ CreatedAt, UpdatedAt                    │
└─────────────────────────────────────────┘
```

---

## API Endpoints Summary

### Organizational Structure (1.4)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | Get all active departments |
| GET | `/api/departments/{id}` | Get department by ID |
| POST | `/api/departments` | Create department (Manager only) |
| PUT | `/api/departments/{id}` | Update department (Manager only) |
| DELETE | `/api/departments/{id}` | Soft delete department (Manager only) |
| GET | `/api/job-positions` | Get all job positions |
| GET | `/api/job-positions?departmentId={id}` | Get positions by department |
| POST | `/api/job-positions` | Create position (Manager only) |
| PUT | `/api/job-positions/{id}` | Update position (Manager only) |
| POST | `/api/users/{id}/transfer` | Transfer user to new dept/position |

### User Account Management (1.1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (Manager only) |
| GET | `/api/users` | Get all users (with filters) |
| GET | `/api/users/{id}` | Get user by ID |
| PUT | `/api/users/{id}` | Update user profile |
| PATCH | `/api/users/{id}/deactivate` | Deactivate user (Manager only) |
| PATCH | `/api/users/{id}/activate` | Activate user (Manager only) |
| DELETE | `/api/users/{id}` | Archive user (soft delete) |

### Authentication (1.2)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (Employee ID/Email/Username) |
| POST | `/api/auth/refresh-token` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Request password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/change-password` | Change password (logged in) |
| GET | `/api/auth/me` | Get current user info |

### Role-Based Access (1.3)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roles` | Get all available roles |
| GET | `/api/roles/permissions` | Get role permissions matrix |
| PATCH | `/api/users/{id}/role` | Update user role (Manager only) |

---

## NuGet Packages Required

Add these to `Backend.csproj`:

```xml
<PackageReference Include="MailKit" Version="4.3.0" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.0.0" />
<PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="8.3.0" />
```

*(No external password hashing package needed - ASP.NET Core's built-in `PasswordHasher<T>` implements PBKDF2 with OWASP-compliant settings)*

---

## Configuration Changes

### appsettings.json (Add these sections)

```json
{
  "JwtSettings": {
    "SecretKey": "YourSuperSecretKeyAtLeast32CharactersLong!",
    "Issuer": "STARS.API",
    "Audience": "STARS.Client",
    "ExpirationInMinutes": 15,
    "RefreshTokenExpirationInDays": 7
  },
  "SmtpSettings": {
    "Host": "smtp.gmail.com",
    "Port": 587,
    "Username": "your-email@gmail.com",
    "Password": "your-app-password",
    "FromEmail": "noreply@stars.com",
    "FromName": "STARS System"
  },
  "SessionSettings": {
    "InactivityTimeoutInMinutes": 15
  }
}
```

---

## File Structure After Module 1

```
backend/
├── Controllers/
│   ├── AuthController.cs          ← NEW
│   ├── UserController.cs          ← NEW
│   ├── DepartmentController.cs    ← NEW
│   ├── JobPositionController.cs   ← NEW
│   ├── RoleController.cs          ← NEW
│   └── ProductsController.cs      ← EXISTING
├── Data/
│   └── AppDbContext.cs            ← UPDATED
├── Models/
│   ├── User.cs                    ← NEW
│   ├── Department.cs              ← NEW
│   ├── JobPosition.cs             ← NEW
│   ├── Enums/
│   │   ├── UserRole.cs            ← NEW
│   │   └── AccountStatus.cs       ← NEW
│   ├── DTOs/
│   │   ├── RegisterUserDTO.cs     ← NEW
│   │   ├── UpdateUserDTO.cs       ← NEW
│   │   ├── LoginDTO.cs            ← NEW
│   │   ├── ResetPasswordDTO.cs    ← NEW
│   │   └── AuthResponseDTO.cs     ← NEW
│   ├── ApiResponseDTO.cs          ← EXISTING
│   └── Product.cs                 ← EXISTING
├── Services/
│   ├── IAuthService.cs            ← NEW
│   ├── AuthService.cs             ← NEW
│   ├── IUserService.cs            ← NEW
│   ├── UserService.cs             ← NEW
│   ├── IEmailService.cs           ← NEW
│   ├── EmailService.cs            ← NEW
│   ├── IDepartmentService.cs      ← NEW
│   ├── DepartmentService.cs       ← NEW
│   ├── IJobPositionService.cs     ← NEW
│   ├── JobPositionService.cs      ← NEW
│   ├── IRoleService.cs            ← NEW
│   ├── RoleService.cs             ← NEW
│   ├── IProductService.cs         ← EXISTING
│   └── ProductService.cs          ← EXISTING
├── Middleware/
│   └── SessionTimeoutMiddleware.cs ← NEW
├── Program.cs                     ← UPDATED
├── appsettings.json               ← UPDATED
└── Backend.csproj                 ← UPDATED
```

---

## Testing Checklist

After implementing each sub-module, verify:

### Sub-Module 1.4 (Organizational Structure)
- [ ] Can create/read/update/delete departments
- [ ] Can create/read/update/delete job positions
- [ ] Job positions are linked to departments
- [ ] Default departments are seeded on startup

### Sub-Module 1.1 (User Account Management)
- [ ] Can register new user with all required fields
- [ ] Temporary password is auto-generated
- [ ] Welcome email is sent with credentials
- [ ] Can update user profile (Manager + Owner)
- [ ] Can deactivate user (blocks login)
- [ ] Can reactivate user
- [ ] Historical data preserved after deactivation

### Sub-Module 1.2 (Authentication)
- [ ] Can login with Employee ID
- [ ] Can login with Email
- [ ] Can login with Username
- [ ] JWT token is returned with role claim
- [ ] Password reset email is sent
- [ ] Can reset password with valid token
- [ ] Session expires after 15 min inactivity

### Sub-Module 1.3 (RBAC)
- [ ] Manager can access all endpoints
- [ ] Coordinator can only access assigned tasks
- [ ] Encoder/Dispatcher/Courier can only see assigned tasks
- [ ] Confidential tasks are hidden from non-Coordinators
- [ ] Role changes take effect immediately

---

## Guide Documents

Each sub-module has its own detailed guide:

1. **[1.1_User_Account_Management.md](./Module%201/1.1_User_Account_Management.md)** - FR-001 to FR-005
2. **[1.2_Authentication_and_Credentials.md](./Module%201/1.2_Authentication_and_Credentials.md)** - FR-006 to FR-008
3. **[1.3_Role_Based_Access_Control.md](./Module%201/1.3_Role_Based_Access_Control.md)** - FR-009 to FR-013
4. **[1.4_Organizational_Structure.md](./Module%201/1.4_Organizational_Structure.md)** - FR-014 to FR-016

Each guide contains:
- High-Level Pseudocode
- Concept Explanations
- Full Code Implementation
- Q&A Section

---

## Notes

- **Frontend is out of scope** - The frontend developer will handle UI implementation
- **Existing patterns** - We follow the existing Controller → Service → DbContext pattern
- **ApiResponseDTO** - All endpoints return `ApiResponseDTO<T>` wrapper
- **Soft deletes** - We use `IsActive` flags instead of hard deletes for audit compliance
- **Email** - SMTP configuration required for password delivery and resets
