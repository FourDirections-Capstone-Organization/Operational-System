# Default Manager Account

## Purpose
A default Manager account is automatically seeded when the application starts for the first time. This allows immediate access to all endpoints without needing to manually create a user.

## Login Credentials

**Email:** `manager@stars.com`  
**Employee Number:** `MGR001`  
**Temporary Password:** `Manager@2024!Temp`

## Account Details

- **Role:** Manager (full access to all endpoints)
- **Name:** System Manager
- **Email Verified:** Yes (can login immediately)
- **Password Changed:** No (will be prompted to change on first login)

## How It Works

1. When the application starts, it checks if a user with email `manager@stars.com` exists
2. If not found, it creates the default Manager account
3. The account is created with a temporary password that must be changed on first login
4. The seeding is idempotent - running the application multiple times won't create duplicate managers

## First Login Flow

1. Login using the credentials above
2. The system will detect `IsPasswordChanged = false`
3. You'll be redirected to change your password
4. After changing the password, you'll have full Manager access

## Notes

- The default manager is NOT assigned to any department or job position
- If you need to assign the manager to a department, you can do so after login
- The temporary password follows OWASP compliance rules (15+ characters, mixed case, numbers, special characters)
- To create a new manager with different credentials, simply register a new user with Manager role after logging in
