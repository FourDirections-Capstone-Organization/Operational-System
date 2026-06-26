# JWT Authentication Guide

## Table of Contents

- [1. Overview](#1-overview)
- [2. Architecture](#2-architecture)
- [3. Models](#3-models)
  - [Employee](#employee)
  - [Account](#account)
  - [RefreshToken](#refreshtoken)
- [4. How Authentication Works](#4-how-authentication-works)
  - [Registration Flow](#registration-flow)
  - [Login Flow](#login-flow)
  - [Token Refresh Flow](#token-refresh-flow)
- [5. Access Token (JWT)](#5-access-token-jwt)
  - [What is a JWT?](#what-is-a-jwt)
  - [How the Access Token is Generated](#how-the-access-token-is-generated)
  - [Token Contents (Claims)](#token-contents-claims)
- [6. Refresh Token](#6-refresh-token)
  - [What is a Refresh Token?](#what-is-a-refresh-token)
  - [Why Do We Need Refresh Tokens?](#why-do-we-need-refresh-tokens)
  - [Auto-Refresh Mechanism (Frontend)](#auto-refresh-mechanism-frontend)
  - [Token Rotation & Revocation](#token-rotation--revocation)
- [7. HTTP Status Codes](#7-http-status-codes)
  - [What is a 401 Unauthorized?](#what-is-a-401-unauthorized)
- [8. isPasswordChanged](#8-ispasswordchanged)
  - [What is isPasswordChanged?](#what-is-ispasswordchanged)
  - [What is it For?](#what-is-it-for)
- [9. API Endpoints](#9-api-endpoints)
  - [POST /api/authentication/register](#post-apiauthenticationregister)
  - [POST /api/authentication/login](#post-apiauthenticationlogin)
  - [POST /api/authentication/refresh](#post-apiauthenticationrefresh)
- [10. Environment Variables](#10-environment-variables)
- [11. FAQ](#11-faq)
  - [Is authToken the same as the Access Token?](#is-authtoken-the-same-as-the-access-token)
  - [Why are the Access Token and Refresh Token separate?](#why-are-the-access-token-and-refresh-token-separate)
  - [What happens when the Access Token expires?](#what-happens-when-the-access-token-expires)
  - [How do I set the JWT key for local development?](#how-do-i-set-the-jwt-key-for-local-development)
  - [How do I set the JWT key for production?](#how-do-i-set-the-jwt-key-for-production)
  - [Can I manually refresh my token?](#can-i-manually-refresh-my-token)
- [12. Production Deployment](#12-production-deployment)
  - [Overview](#overview)
  - [Azure Container Registry (Backend)](#azure-container-registry-backend)
  - [Azure Database for PostgreSQL](#azure-database-for-postgresql)
  - [Vercel (Frontend)](#vercel-frontend)
  - [Putting It All Together](#putting-it-all-together)

---

> **For local development:** Each developer generates their **own** JWT key. No sharing needed. Run this in PowerShell:
> ```powershell
> $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)
> ```
> Put the output in a `.env` file (`JWT_KEY=<your-generated-key>`) for Docker, or set it as a system environment variable (`Jwt__Key`). The only key that requires secrecy is **production** — that one stays in CI/CD / Azure, never in a developer's hands.

## 1. Overview

This system uses **JWT (JSON Web Token)** authentication to secure the API. When a user logs in, they receive two tokens:

- **Access Token** — a short-lived JWT used to authenticate API requests
- **Refresh Token** — a long-lived opaque token used to get new Access Tokens without re-logging in

Authentication is handled by three backend components:
- **Employee** model — stores personal information
- **Account** model — stores security credentials (password hash, role)
- **AuthService** — handles registration, login, and token refresh logic

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  login.tsx                       main.tsx                       │
│  ┌──────────────┐               ┌──────────────────────────┐    │
│  │ User enters  │──POST──────>  │ axios request interceptor │    │
│  │ credentials  │  /api/auth/   │ attaches Bearer token     │    │
│  └──────────────┘  login        └──────────────────────────┘    │
│                                       │                         │
│                                       ▼                         │
│                               ┌──────────────────────────┐    │
│                               │ axios response interceptor│    │
│                               │ auto-refreshes on 401    │    │
│                               └──────────────────────────┘    │
└──────────────────────────────────┬──────────────────────────────┘
                                   │ HTTP
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (ASP.NET Core)                     │
│                                                                 │
│  AuthenticationController                                       │
│  ┌────────────────────────────────┐                             │
│  │ POST /api/authentication/      │                             │
│  │   register / login / refresh   │                             │
│  └──────────────┬─────────────────┘                             │
│                 ▼                                               │
│  AuthService                                                    │
│  ┌────────────────────────────────┐                             │
│  │ RegisterAsync()               │                             │
│  │ LoginAsync()                  │                             │
│  │ RefreshTokenAsync()           │                             │
│  └──────┬────────────────────────┘                             │
│         │                                                      │
│         ▼                                                      │
│  ┌────────────────────────────────┐                             │
│  │ AppDbContext (PostgreSQL)      │                             │
│  │  - Employees table             │                             │
│  │  - Accounts table              │                             │
│  │  - RefreshTokens table         │                             │
│  └────────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Models

The authentication system uses three database tables linked together:

```
┌──────────────┐       ┌──────────────┐       ┌──────────────────┐
│   Employee   │ 1──1  │   Account    │ 1──*  │  RefreshToken    │
├──────────────┤       ├──────────────┤       ├──────────────────┤
│ Id (Guid)    │<──────│ EmployeeId   │       │ Id (Guid)        │
│ FirstName    │       │ PasswordHash │       │ AccountId        │
│ MiddleName   │       │ Role         │       │ Token            │
│ LastName     │       │ CreatedAt    │       │ ExpiresAt        │
│ Suffix       │       │ UpdatedAt    │       │ IsRevoked        │
│ Email        │       └──────┬───────┘       │ CreatedAt        │
│ EmployeeID   │              │               └──────────────────┘
│ ContactNumber│              │ (FK)
│ Gender       │              │
│ CreatedAt    │              │
│ UpdatedAt    │              │
└──────────────┘              │
```

### Employee

Stores personal information about the employee. It has a **one-to-one** relationship with Account.

| Field | Type | Description |
|---|---|---|
| Id | Guid | Primary key, auto-generated |
| FirstName | string | Required, max 100 characters |
| MiddleName | string? | Optional, max 100 characters |
| LastName | string | Required, max 100 characters |
| Suffix | string? | Optional (e.g., Jr., III), max 20 characters |
| Email | string | Required, unique, max 256 characters |
| EmployeeID | string | Required, unique (e.g., "EMP-001" or "0001") |
| ContactNumber | string | Required, max 20 characters |
| Gender | string | Required, max 20 characters |
| CreatedAt | DateTime | Set automatically on creation |
| UpdatedAt | DateTime? | Set when record is modified |

### Account

Stores security-related data. **One Account per Employee.**

| Field | Type | Description |
|---|---|---|
| Id | Guid | Primary key, auto-generated |
| EmployeeId | Guid | Foreign key to Employee (unique — one-to-one) |
| PasswordHash | string | Hashed password (never stored in plain text) |
| Role | string | User role: "SystemAdmin", "Employee", etc. |
| CreatedAt | DateTime | Set automatically on creation |
| UpdatedAt | DateTime? | Set when password is changed |

### RefreshToken

Stores refresh tokens. **Multiple Refresh Tokens per Account.**

| Field | Type | Description |
|---|---|---|
| Id | Guid | Primary key, auto-generated |
| AccountId | Guid | Foreign key to Account |
| Token | string | The actual refresh token value (random, base64) |
| ExpiresAt | DateTime | When this token expires (default: 7 days) |
| IsRevoked | bool | Whether this token has been invalidated |
| CreatedAt | DateTime | Set automatically on creation |

---

## 4. How Authentication Works

### Registration Flow

```
User submits registration form
        │
        ▼
POST /api/authentication/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@speedex.com",
  "employeeID": "EMP-001",
  "password": "securePassword123",
  ...
}
        │
        ▼
AuthService.RegisterAsync()
   ├─ Check email not already taken
   ├─ Check EmployeeID not already taken
   ├─ Hash the password (PasswordHasher)
   ├─ Create Employee record in database
   ├─ Create Account record linked to Employee
   │    (role defaults to "Employee")
   ├─ Generate Access Token (JWT)
   └─ Generate Refresh Token (random, stored in DB)
        │
        ▼
Response 200 OK
{
  "isSuccess": true,
  "message": "Success",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBh...",
  "expiresAt": "2026-06-25T13:00:00Z",
  "role": "Employee",
  "employeeName": "John Doe",
  "employeeID": "EMP-001",
  "isPasswordChanged": false,
  "firstName": "John",
  ...
}
```

### Login Flow

```
User enters Employee ID + Password on login page
        │
        ▼
POST /api/authentication/login
{
  "employeeNumber": "EMP-001",
  "password": "securePassword123"
}
        │
        ▼
AuthService.LoginAsync()
   ├─ Find Employee by EmployeeID
   ├─ Load the linked Account
   ├─ Verify password using PasswordHasher
   ├─ Revoke any existing (unexpired) refresh tokens
   ├─ Generate new Access Token (JWT)
   └─ Generate new Refresh Token (stored in DB)
        │
        ▼
Response 200 OK
{
  "isSuccess": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "bmV3IHJlZnJl...",
  "role": "Employee",
  "employeeName": "John Doe",
  "isPasswordChanged": true,
  ...
}
        │
        ▼
Frontend saves to localStorage:
  - authToken → the access token (JWT)
  - refreshToken → the refresh token
  - role, employeeId, employeeName, etc.
        │
        ▼
User is redirected to their dashboard based on role
```

### Token Refresh Flow

```
Access Token expires (after 15 minutes)
        │
        ▼
Frontend makes API call → gets 401 Unauthorized
        │
        ▼
Axios interceptor catches the 401
   ├─ Check if refreshToken exists in localStorage
   ├─ If yes: POST /api/authentication/refresh
   │    { "refreshToken": "bmV3IHJlZnJl..." }
   │    │
   │    ▼
   │  AuthService.RefreshTokenAsync()
   │    ├─ Find RefreshToken in DB by token value
   │    ├─ Check not revoked and not expired
   │    ├─ Revoke the old refresh token (rotation)
   │    └─ Generate new Access Token + new Refresh Token
   │    │
   │    ▼
   │  Response 200 OK (new tokens)
   │
   ├─ Update localStorage with new tokens
   └─ Retry the original failed request with new Access Token
        │
        ▼
Request succeeds — user never noticed the refresh
```

---

## 5. Access Token (JWT)

### What is a JWT?

A **JSON Web Token (JWT)** is a self-contained token that carries user information (called "claims") inside it. It is:

- **Stateless** — the server does not need to store it; it validates the signature
- **Self-contained** — it contains all the information needed to identify the user
- **Signed** — uses HMAC-SHA256 to prevent tampering
- **Short-lived** — expires after 15 minutes by default

A JWT looks like this:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJqb2huQHNwZWVkZXguY29tIiwicm9sZSI6IkVtcGxveWVlIn0.dQw4w9WgXcQ
```

It has three parts separated by dots:
1. **Header** — algorithm and token type (base64-encoded JSON)
2. **Payload** — the claims (base64-encoded JSON)
3. **Signature** — cryptographic proof the token hasn't been tampered with

### How the Access Token is Generated

```
1. Read JWT secret key from configuration (Jwt:Key)
2. Create a SymmetricSecurityKey from the secret
3. Create SigningCredentials using HMAC-SHA256
4. Create claims (user identity information)
5. Set expiration time (15 minutes from now)
6. Create JwtSecurityToken with issuer, audience, claims, expiry, signing key
7. Serialize to string using JwtSecurityTokenHandler
```

### Token Contents (Claims)

When decoded, the JWT payload looks like this:

```json
{
  "sub": "3a4b5c6d-7e8f-...",
  "email": "john@speedex.com",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Employee",
  "employeeId": "EMP-001",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name": "John Doe",
  "employeeNumber": "EMP-001",
  "exp": 1750000000,
  "iss": "OperationalSystem",
  "aud": "OperationalSystem"
}
```

| Claim | Description |
|---|---|
| sub | Account ID (used to identify the user) |
| email | Employee's email address |
| role | User's role for authorization (SystemAdmin, Employee, etc.) |
| employeeId | Employee's ID number |
| name | Full name of the employee |
| employeeNumber | Same as EmployeeID — used by frontend |
| exp | Expiration timestamp (Unix epoch) |
| iss | Issuer — identifies who created the token |
| aud | Audience — identifies who the token is for |

---

## 6. Refresh Token

### What is a Refresh Token?

A **Refresh Token** is a long-lived token used to obtain new Access Tokens **without requiring the user to re-enter their password**. Unlike the Access Token (a JWT), the Refresh Token is:

- **Opaque** — it's just a random string, not a JSON structure
- **Stored in the database** — linked to the Account it belongs to
- **Long-lived** — expires after 7 days by default
- **Revocable** — can be invalidated at any time

### Why Do We Need Refresh Tokens?

- **Security**: Access Tokens are short-lived (15 min), so if one is stolen, the damage is limited
- **User Experience**: Users don't need to log in every 15 minutes — the refresh happens automatically in the background
- **Revocation**: If an account is compromised, all refresh tokens can be revoked, forcing a re-login

### Auto-Refresh Mechanism (Frontend)

The auto-refresh is handled by an **Axios response interceptor** in `main.tsx`. Here's how it works step by step:

1. **Every request** the frontend makes goes through the Axios request interceptor, which attaches the `authToken` (Access Token) as a `Bearer` token in the `Authorization` header.

2. **If the Access Token is expired**, the server returns a **401 Unauthorized** response.

3. **The response interceptor catches the 401** and checks if a `refreshToken` exists in localStorage.

4. **If a refresh token exists**, it calls `POST /api/authentication/refresh` with the refresh token value.

5. **The server validates the refresh token**, generates a new pair of tokens (new Access Token + new Refresh Token), and revokes the old refresh token (this is called **token rotation**).

6. **The frontend updates localStorage** with the new `authToken` and `refreshToken`.

7. **The original failed request is retried** with the new Access Token.

8. **If the refresh also fails** (refresh token expired or revoked), localStorage is cleared and the user is redirected to the login page.

**Request queuing**: If multiple API calls fail with 401 at the same time, only one refresh request is made. The other requests are queued and automatically retried once the new token is obtained.

### Token Rotation & Revocation

Each time a refresh is performed:

- The **old refresh token** is marked as `IsRevoked = true` in the database
- A **new refresh token** is created and stored

This means:
- If a stolen refresh token is used, the original owner's token will be revoked on the next refresh
- Each refresh token can only be used once
- Old tokens cannot be reused

---

## 7. HTTP Status Codes

### What is a 401 Unauthorized?

**401 Unauthorized** is an HTTP status code that means **"you are not authenticated"** — the server doesn't know who you are or your credentials are invalid/expired.

In this system, 401 is returned in two situations:

| Situation | Why |
|---|---|
| Login with wrong Employee ID or password | The server cannot identify you |
| Using an expired or invalid Access Token | The server can't verify your identity — the token is no longer valid |

When the frontend receives a 401:
1. It **automatically tries to refresh the token** (if a refresh token exists)
2. If refresh fails, it **clears localStorage** and **redirects** to the login page

> **Note**: 401 is different from **403 Forbidden**. 401 means "who are you?", while 403 means "I know who you are, but you're not allowed to do this."

---

## 8. isPasswordChanged

### What is isPasswordChanged?

`isPasswordChanged` is a boolean field in the login response that tells the frontend whether the user has **ever changed their password**.

```
"isPasswordChanged": true   → User has changed their password before
"isPasswordChanged": false  → User is still using their default/temporary password
```

### What is it For?

The system determines this by checking if the `Account.UpdatedAt` field is set:

- When an Account is first created, `UpdatedAt` is **null**
- When the user changes their password, `UpdatedAt` is set to the current timestamp
- `isPasswordChanged` returns `true` if `UpdatedAt` has a value

The frontend uses this to decide the **post-login flow**:

```
Login successful
        │
        ▼
isPasswordChanged?
        │
   ┌────┴────┐
   │         │
  true      false
   │         │
   ▼         ▼
Go to      Go to onboarding/
dashboard  set-password page
           (first-time setup)
```

This prevents users who haven't set their own password from accessing the dashboard.

---

## 9. API Endpoints

### POST /api/authentication/register

Creates a new Employee + Account pair.

**Request:**
```json
{
  "firstName": "John",
  "middleName": null,
  "lastName": "Doe",
  "suffix": null,
  "email": "john@speedex.com",
  "employeeID": "EMP-001",
  "contactNumber": "09123456789",
  "gender": "Male",
  "password": "securePassword123"
}
```

**Response 200:**
```json
{
  "isSuccess": true,
  "message": "Success",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBh...",
  "expiresAt": "2026-06-25T13:00:00Z",
  "role": "Employee",
  "employeeName": "John Doe",
  "employeeID": "EMP-001",
  "isPasswordChanged": false,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@speedex.com",
  ...
}
```

**Response 400 (validation error):**
```json
{
  "isSuccess": false,
  "message": "Email is already registered."
}
```

### POST /api/authentication/login

Authenticates a user and returns tokens.

**Request:**
```json
{
  "employeeNumber": "EMP-001",
  "password": "securePassword123"
}
```

**Response 200:**
```json
{
  "isSuccess": true,
  "message": "Success",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "bmV3IHJlZnJl...",
  "expiresAt": "2026-06-25T13:00:00Z",
  "role": "Employee",
  "employeeName": "John Doe",
  "employeeID": "EMP-001",
  "isPasswordChanged": true,
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@speedex.com",
  "contactNumber": "09123456789",
  ...
}
```

**Response 401:**
```json
{
  "isSuccess": false,
  "message": "Invalid credentials."
}
```

### POST /api/authentication/refresh

Exchanges a refresh token for a new pair of tokens.

**Request:**
```json
{
  "refreshToken": "bmV3IHJlZnJl..."
}
```

**Response 200:**
```json
{
  "isSuccess": true,
  "message": "Success",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "YW5vdGhlciByZWZy...",
  "expiresAt": "2026-06-25T13:00:00Z",
  "role": "Employee",
  "employeeName": "John Doe",
  ...
}
```

**Response 401:**
```json
{
  "isSuccess": false,
  "message": "Invalid or expired refresh token."
}
```

---

## 10. Environment Variables

The JWT signing key is **never hardcoded** in source code. It is provided through environment variables in three places:

| Priority | Source | Configuration Key |
|---|---|---|
| 1 (highest) | `docker-compose.yml` | `Jwt__Key` (double underscore maps to `Jwt:Key`) |
| 2 | `Properties/launchSettings.json` | `Jwt__Key` (local development) |
| 3 | `appsettings.Development.json` | `Jwt.Key` (development fallback) |

### Why is the JWT Key in three different places?

The reason is that .NET Core has a **layered configuration system** — config values from different sources are merged, and the highest priority source wins. Each of the three locations serves a different scenario:

| Source | When it's used | Purpose |
|---|---|---|
| `appsettings.Development.json` | Running with `dotnet run` or `dotnet watch` (no Visual Studio) | Provides a dev key as a JSON config file. Only loaded in the `Development` environment — ignored in Production. |
| `Properties/launchSettings.json` | Running via Visual Studio / `dotnet run` (reads launchSettings) | Sets the key as an **environment variable** (`Jwt__Key`). Environment variables have higher priority than JSON config files. |
| `docker-compose.yml` | Running via `docker compose up` | Sets the key as an environment variable inside the Docker container. This is how the key is provided in deployed/staging environments. |

### Why not just one place?

Because different developers and environments run the app differently, and each method reads configuration from a different source:

1. **Developer A** runs `dotnet run` in their terminal — they hit `appsettings.Development.json` (no launchSettings env vars are set unless using `dotnet run --launch-profile "http"`).

2. **Developer B** presses F5 in Visual Studio — launchSettings.json kicks in and sets `Jwt__Key` as a real environment variable, which **overrides** the value in `appsettings.Development.json`.

3. **The server** runs via `docker compose up` — the Docker container gets `Jwt__Key` from the `docker-compose.yml` environment section, which **overrides** everything else.

### The .NET Configuration Hierarchy

When the app reads `builder.Configuration["Jwt:Key"]`, it checks these sources in order (last wins — highest priority):

```
1. appsettings.json                       ← base config (lowest priority)
2. appsettings.Development.json           ← development overrides
3. Environment variables (Jwt__Key)       ← highest priority
```

So if the same key is set in all three places, the **environment variable** always wins. The `appsettings.Development.json` version acts as a fallback in case the env var isn't set.

### In `launchSettings.json`:
```json
"environmentVariables": {
  "Jwt__Key": "your-real-key-here"
}
```

### In `docker-compose.yml` (recommended pattern — keeps secrets out of git):

Instead of hardcoding the key in `docker-compose.yml`, use an **environment variable reference** that reads from a `.env` file:

```yaml
backend:
  environment:
    Jwt__Key: "${JWT_KEY}"
```

Then create a `.env` file in the **project root** (same folder as `docker-compose.yml`):

```
JWT_KEY=your-real-production-key
```

**Why this is better:**
- `.env` is already in `.gitignore` (line 12) — the real key is never committed
- `docker-compose.yml` stays clean with no secrets
- Each developer/server can have their own `.env` with different keys
- CI/CD can inject the key via GitHub Secrets without touching any file

> **⚠️ Never commit the real key to GitHub.** The files `appsettings.Development.json`, `launchSettings.json`, and `docker-compose.yml` are all tracked in git and must not contain real secrets.

### How to set the key locally (no manual swapping needed)

Because .NET's config is layered, **you never need to manually edit files to swap keys**. The environment variable automatically overrides the placeholder:

| If you run via... | Set the real key here... | And the app reads... |
|---|---|---|
| `docker compose up` | `.env` file → `JWT_KEY=...` | ✅ Env var wins automatically |
| `dotnet run` / VS Code | System env var `Jwt__Key` | ✅ Env var wins automatically |
| Visual Studio F5 | System env var `Jwt__Key` | ✅ Env var wins over launchSettings |

**To set a system environment variable (Windows PowerShell):**
```powershell
[System.Environment]::SetEnvironmentVariable('Jwt__Key', 'your-real-key', 'User')
```

After setting, restart your terminal/IDE. The placeholder in the JSON files is completely ignored.

---

## 11. Production Deployment

### Overview

When deploying to production, the JWT key must **never** be hardcoded in any file that gets committed to git. Here is how each service handles the key:

| Service | Hosts | Needs Jwt Key? | How to set it |
|---|---|---|---|
| **Azure Container Registry** | Backend (Docker image) | Yes — at container runtime | Environment variable in the container orchestrator |
| **Azure Database for PostgreSQL** | Database | No | Connection string only |
| **Vercel** | Frontend (React) | No | Backend API URL only |

The JWT key is a **backend secret** — the frontend never sees it.

### Azure Container Registry (Backend)

1. Build and push the backend Docker image to ACR:
   ```powershell
   docker build -t backend ./backend
   docker tag backend yourregistry.azurecr.io/backend:latest
   docker push yourregistry.azurecr.io/backend:latest
   ```

2. At runtime (Azure Container Instances, Azure App Service, or Kubernetes), set the JWT key as an **environment variable** — never bake it into the image:

   ```powershell
   # Example: Azure Container Instances
   az container create \
     --resource-group your-rg \
     --name backend \
     --image yourregistry.azurecr.io/backend:latest \
     --environment-variables \
       Jwt__Key="your-production-key" \
       ConnectionStrings__DefaultConnection="Host=..." \
     --registry-login-server yourregistry.azurecr.io \
     --registry-username $(az acr credential show -n yourregistry --query username) \
     --registry-password $(az acr credential show -n yourregistry --query passwords[0].value)
   ```

   Or if using Azure App Service:
   ```powershell
   az webapp config appsettings set \
     --resource-group your-rg \
     --name your-backend-app \
     --settings \
       Jwt__Key="your-production-key" \
       ConnectionStrings__DefaultConnection="Host=..."
   ```

   > **Never put the real key in `docker-compose.yml` for production.** Use CI/CD secrets (GitHub Actions Secrets, Azure Key Vault, etc.) to inject it at deploy time.

### Azure Database for PostgreSQL

1. Provision a PostgreSQL instance (Azure Database for PostgreSQL Flexible Server).
2. Get the connection string from the Azure Portal.
3. Set it as `ConnectionStrings__DefaultConnection` environment variable on the container (see example above).

The database itself does not need the JWT key — it only needs the connection string.

### Vercel (Frontend)

Vercel hosts the React frontend only. It **does not** need the JWT key. What it needs is the backend's public URL so API calls reach the right place.

1. In your Vercel project settings, add an environment variable:
   - Name: `VITE_API_URL` (or whatever the frontend uses as the API base URL)
   - Value: `https://your-backend.azurewebsites.net`

2. The frontend build will use this URL for all API calls. The JWT key stays on the backend — Vercel never touches it.

3. The auto-refresh interceptor (in `main.tsx`) works the same in production — it calls the refresh endpoint, which is handled by the Azure-hosted backend.

### Putting It All Together

```
User's Browser
      │
      ▼
Vercel (React SPA)                  ← No JWT key needed here
      │  POST /api/authentication/login
      │  Authorization: Bearer <JWT>
      ▼
Azure Container Instances / App Service
  ┌─────────────────────────────┐
  │ Backend (ASP.NET Core)      │  ← Jwt__Key set as env var here
  │ Reads Jwt__Key from env var │
  └──────────┬──────────────────┘
             │
             ▼
Azure Database for PostgreSQL    ← Connection string only, no JWT
```

The flow is identical to local development:
- Frontend sends credentials → backend validates → returns JWT tokens
- Frontend sends JWT with every request → backend verifies signature using `Jwt__Key`
- On 401, frontend auto-refreshes via `/api/authentication/refresh`
- The only difference in production is `Jwt__Key` is a **CI/CD secret**, not a local file

### Setting the Production Key Securely

**Option A — GitHub Actions + Azure Key Vault (recommended):**
1. Store the JWT key in Azure Key Vault
2. In your GitHub Actions workflow, pull the secret and inject it as an env var on the deployed container

**Option B — GitHub Secrets:**
1. Go to your repo → Settings → Secrets and variables → Actions
2. Add a secret called `JWT_KEY` with the production value
3. In your deploy workflow, reference `${{ secrets.JWT_KEY }}` and pass it to the container

**Option C — Azure Portal directly:**
1. In the Azure Portal, go to your App Service → Settings → Environment variables
2. Add `Jwt__Key` with the production value
3. Azure encrypts it at rest

---

## 12. FAQ

### Is authToken the same as the Access Token?

**Yes.** `authToken` is what the frontend calls the Access Token in localStorage. They are the same thing — the JWT that is sent with every API request as a `Bearer` token in the `Authorization` header.

In the frontend:
```
localStorage.getItem('authToken')  →  the JWT Access Token
loginResponse.accessToken          →  also the JWT Access Token (set in the backend response)
```

The reason it's called `authToken` in localStorage is simply naming convention — it's the token used for authentication.

### Why are the Access Token and Refresh Token separate?

- **Access Token** is short-lived (15 min) and sent with every request. If stolen, the damage window is small.
- **Refresh Token** is long-lived (7 days) but stored more securely (only sent to the refresh endpoint). If stolen, it can be revoked.

This is a standard security practice called **token-based authentication with refresh token rotation**.

### What happens when the Access Token expires?

The user does **not** see any error. The frontend's Axios interceptor automatically:
1. Detects the 401 response
2. Silently refreshes the token in the background
3. Retries the failed request
4. The user continues their session uninterrupted

Only if the **Refresh Token** also expires (after 7 days of inactivity) will the user be redirected to the login page.

### Why is the JWT signing key in three different files?

See [Section 10 — Environment Variables](#10-environment-variables) for the full explanation. The short answer: each file targets a different way of running the app (`dotnet run`, Visual Studio F5, Docker), and .NET's layered config system ensures the right one wins for each scenario.

### How do I set the JWT key for local development?

Generate your own random key and never share it:

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); $bytes = New-Object byte[] 32; $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes)
```

Then choose one method to set it:

| Method | How |
|---|---|
| **`.env` file** (for Docker) | `JWT_KEY=<your-key>` in project root `.env` |
| **System env var** (for `dotnet run`) | `[System.Environment]::SetEnvironmentVariable('Jwt__Key', '<your-key>', 'User')` |
| **`launchSettings.json`** (for VS) | Put it there **but never commit it** |

See [Section 10 — Environment Variables](#10-environment-variables) for the full explanation of the config hierarchy.

### How do I set the JWT key for production?

See [Section 11 — Production Deployment](#11-production-deployment) for the full guide. The short answer: inject it as a secure environment variable at the container runtime level (Azure App Service settings, Azure Container Instances env vars, or Kubernetes Secrets). Never hardcode it in any file that gets committed.

### Can I manually refresh my token?

Yes, you can call `POST /api/authentication/refresh` with your current refresh token to get a new pair of tokens. This is useful for testing with API tools like Postman or Scalar.
