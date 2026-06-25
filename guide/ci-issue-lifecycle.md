# CI Issue Lifecycle

## Table of Contents

- [1. Overview](#1-overview)
- [2. How Issues Are Created](#2-how-issues-are-created)
- [3. How Issues Auto-Close](#3-how-issues-auto-close)
- [4. CI Does Not Auto-Merge — That's Your Job](#4-ci-does-not-auto-merge--thats-your-job)
- [5. Fixing a Failed CI (Push Flow)](#5-fixing-a-failed-ci-push-flow)
- [6. Fixing a Failed CI (PR Flow)](#6-fixing-a-failed-ci-pr-flow)
- [7. Event Handling Reference](#7-event-handling-reference)
- [8. Edge Cases](#8-edge-cases)
- [9. Cleanup Workflow](#9-cleanup-workflow)
- [10. FAQ](#10-faq)

---

## 1. Overview

When CI fails on a branch, the system automatically creates a GitHub Issue to track the failure. When CI passes again on the same branch, that issue is automatically closed. This gives you a clear record of what broke and when it was fixed — all without manual issue management.

There are **two workflows** involved:

| Workflow | File | Purpose |
|---|---|---|
| **CI** | `.github/workflows/ci.yml` | Builds, tests, creates issues on failure, closes issues on success |
| **Cleanup CI Issues** | `.github/workflows/cleanup-ci-issues.yml` | Closes stale issues when a branch is deleted or a PR is closed |

---

## 2. How Issues Are Created

Each **job** gets its **own issue** per **branch**. The issue title follows this pattern:

```
CI Failure: <job-name> on <branch-name>
```

| Job | Example title |
|---|---|
| Backend (.NET) | `CI Failure: backend on feature/new-button` |
| Frontend (React) | `CI Failure: frontend on feature/new-button` |
| Docker Images | `CI Failure: docker on feature/new-button` |

**Duplicate prevention:** If CI fails multiple times on the same branch (e.g., pushing multiple failing commits), the create step checks if an open issue already exists with that exact title. If yes, it skips creation — you get **one issue per job per branch**, not one per commit.

---

## 3. How Issues Auto-Close

When CI runs and **all steps pass** on a branch, the auto-close step:

1. Searches for an open issue with the title `CI Failure: <job> on <branch>`
2. If found → closes it with a comment: `✅ CI is passing again on <branch>`
3. If not found → nothing happens (no issue was open)

This means the issue lifecycle is fully automated:

```
Push → CI fails → Issue created
Push (with fix) → CI passes → Issue closed
```

No manual intervention needed.

---

## 4. CI Does Not Auto-Merge — That's Your Job

A common misunderstanding: **CI passing does NOT automatically merge your branch.** CI only checks that the code builds and tests pass. Merging is always a manual action.

**The process is:**

```
You push code
       │
       ▼
CI runs the checks
       │
       ▼
       ├── CI fails → Issue created → You fix it → Push again → CI re-runs → CI passes
       │
       └── CI passes → Issue auto-closes (if one was open)
                        ↓
                 You merge the PR manually
```

CI is a **gatekeeper**, not a butler. It prevents broken code from being merged, but it never merges anything itself.

---

## 5. Fixing a Failed CI (Push Flow)

This is the simplest scenario — you're working on a branch and CI fails.

```
You push code to feature/x
        │
        ▼
CI fails
        │
        ▼
Issue created: "CI Failure: backend on feature/x"
        │
        ▼
You fix the code locally

        │
        ▼
You push the fix to feature/x (same branch)
        │
        ▼
CI runs again automatically (triggered by push)
        │
        ▼
        ├── Still fails → Issue stays open → Fix more → Push again
        │
        └── Passes → Issue auto-closes
                      │
                      ▼
               Branch is ready for PR
```

**Key point:** You push the fix to the **same branch**. CI re-runs automatically. No new branch needed.

---

## 6. Fixing a Failed CI (PR Flow)

Your PR has a CI failure. How to fix it.

```
You open PR: feature/x → main
        │
        ▼
CI runs on the PR
        │
        ▼
CI fails
        │
        ▼
Issue created: "CI Failure: backend on feature/x"
        │
        ▼
PR shows red ❌ — cannot merge (blocked by CI status check)
        │
        ▼
You fix the code locally on feature/x
        │
        ▼
You push the fix to feature/x (the same branch as the PR)
        │
        ▼
GitHub automatically detects the push and triggers CI on the existing PR
                                         │
                                         ▼
                                  CI runs again on the same PR
                                         │
                                         ▼
                              ├── Still fails → Fix more → Push again
                              │
                              └── Passes → Issue auto-closes
                                             │
                                             ▼
                                      PR shows green ✅
                                             │
                                             ▼
                              You click "Merge pull request" manually

```

**Key point:** You **do not** need to close the PR and open a new one. Pushing to the same branch that the PR is from automatically updates the PR and re-runs its CI.

**What NOT to do:**

| ❌ Wrong | ✅ Right |
|---|---|
| Close the broken PR and open a new one | Push the fix to the same branch |
| Create a new branch and PR with the fix | Update the existing branch |
| Click "Merge" while CI is red | Wait for CI to go green |

---

## 7. Event Handling Reference

`BRANCH_NAME` is determined by:

```yaml
BRANCH_NAME: ${{ github.head_ref || github.ref_name }}
```

- `github.head_ref` = source branch (only set for `pull_request` events)
- `github.ref_name` = fallback for `push` events

| Event | `github.event_name` | `github.head_ref` | `github.ref_name` | `BRANCH_NAME` |
|---|---|---|---|---|
| Push to `feature/x` | `push` | empty | `feature/x` | `feature/x` |
| PR `feature/x` → `main` | `pull_request` | `feature/x` | `1/merge` | `feature/x` |
| Branch `feature/x` deleted | `delete` | — | — | `feature/x` |
| PR `feature/x` → `main` closed | `pull_request` | `feature/x` | `1/merge` | `feature/x` |

---

## 8. Edge Cases

| Scenario | What happens | Why it's correct |
|---|---|---|
| **Push fails → PR created from same branch** | One issue (duplicate check prevents a second) | Same branch, same issue title |
| **Push fails → fix pushed → CI passes** | Issue closed | Auto-close finds and closes the issue |
| **PR fails (no prior push) → fix pushed → PR passes** | Issue created, then closed | Full lifecycle works end-to-end |
| **CI flake (rerun passes on same code)** | Issue closed | Second run's auto-close step runs |
| **Branch deleted with open issue** | Issue closed by cleanup workflow | Prevents stale issues |
| **PR merged even with failing CI** | Issue closed by cleanup workflow | PR closed triggers cleanup |
| **PR closed without merging** | Issue closed by cleanup workflow | Same trigger as merge |
| **Multiple jobs fail on same branch** | One issue per job (max 3) | Each job tracks independently |
| **PR from a fork** | Issue created in base repo | `GH_TOKEN` belongs to the base repo |

---

## 9. Cleanup Workflow

The `.github/workflows/cleanup-ci-issues.yml` handles two scenarios that the auto-close cannot:

| Scenario | Trigger | What the workflow does |
|---|---|---|
| Branch deleted | `delete` event | Finds all open CI failure issues for that branch and closes them |
| PR closed (merged or not) | `pull_request: closed` | Finds all open CI failure issues for the PR's source branch and closes them |

This prevents issues from accumulating when:
- A feature branch is abandoned without fixing CI
- An administrator merges a PR despite CI failure (bypassing branch protection)
- A PR is closed without merging (e.g., superseded by another PR)

---

## 10. FAQ

### Do I need to create a new PR if CI fails on my current PR?

**No.** Push the fix to the **same branch**. GitHub automatically updates the existing PR and re-runs CI.

### Will CI auto-merge my branch when it passes?

**No.** CI only checks your code. You must manually click "Merge" on the PR. CI is a safety gate, not an automated merge tool.

### What if I push multiple failing commits?

Only **one issue** is created per job per branch. The duplicate check prevents spamming the issue tracker.

### What happens if CI passes after a failure?

The issue is automatically closed with a ✅ comment. No action needed from you.

### What is a "CI flake"?

A **CI flake** is when CI fails one time, but if you re-run it without changing any code, it passes.

The code is the same both times — the failure was caused by something temporary, not a bug in your code.

#### What it looks like (the flow)

```
You push perfectly good code
        │
        ▼
npm install  ✅
dotnet build ✅
        │
        ▼
npm test ─── ❌ FAILS
        │
        ▼
Error shows:
  "npm ERR! network timeout"
  or "The operation timed out"
  or "connect ECONNREFUSED"
        │
        ▼
Issue created: "CI Failure: frontend on feature/x"
        │
        ▼
You check the error → it's a timeout/network issue, not a code bug
        │
        ▼
You click "Re-run jobs" in GitHub Actions — no code changes
        │
        ▼
CI runs again — same code, same commit
        │
        ▼
Everything passes this time ✅
        │
        ▼
Issue auto-closes with comment: "✅ CI is passing again on feature/x"
```

#### How to tell a flake from a real bug

| This error... | Is a flake if... | Is a real bug if... |
|---|---|---|
| `npm ERR! network timeout` | Re-running fixes it | — |
| `Test timed out after 5000ms` | Re-running fixes it | The test logic is genuinely slow |
| `connect ECONNREFUSED` | Re-running fixes it | The server is actually down |
| `AssertionError: expected 5 to equal 3` | — | Always a real bug |
| `error CS0117: 'Product' does not contain 'Price'` | — | Always a real bug |
| `TypeError: Cannot read properties of undefined` | — | Always a real bug |

**The tell:** If re-running without changing anything makes it pass, it was a flake.

**What to do:** You don't need to fix anything. Just click **"Re-run jobs"** in the Actions tab. When it passes, the issue auto-closes.

### What if I delete the branch without fixing CI?

The cleanup workflow closes the issue automatically when the branch is deleted or the PR is closed.

### Can I have CI failure issues for multiple branches at the same time?

Yes. Each branch gets its own set of issues (one per job). They are independent.
