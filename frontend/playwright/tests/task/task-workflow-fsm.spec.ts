import { test, expect } from '@playwright/test';
import { login, logout, waitForDashboard, waitForSuccessToast, openSidebarTab } from '../../helpers/auth';
import {
  clickNewTask, fillTaskTitle, fillTaskDescription, selectPriority,
  selectClassification, selectSingleAssignee, submitTaskForm,
} from '../../helpers/task';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';
const ENCODER_PW = process.env.ENCODER_PW || '';

test.beforeAll(() => {
  const missing = [
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
    !ENCODER_PW && 'ENCODER_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 2.2: Task Workflow FSM', () => {
  test('full forward flow (create → advance → reject → resubmit → approve)', async ({ page }) => {
    const taskTitle = `FSM Forward ${Date.now()}`;

    // ── 1. Coordinator creates a task ──
    await test.step('Coordinator creates a task', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);
      await fillTaskTitle(page, taskTitle);
      await fillTaskDescription(page, 'FSM flow test task');
      await selectPriority(page, 'Medium');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, ENCODER_ID);
      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    // ── 2. Encoder advances task: assigned → in-progress ──
    await test.step('Encoder advances task to In Progress', async () => {
      await logout(page, 'Coordinator');
      await login(page, ENCODER_ID, ENCODER_PW);
      await waitForDashboard(page, 'Encoder');
      await openSidebarTab(page, 'My Tasks');

      const card = page.locator('.task-card', { has: page.locator('.tc-name', { hasText: taskTitle }) });
      await card.click();
      await page.locator('button.btn.btn-primary', { hasText: 'Update Progress' }).click();

      await page.locator('button.filter-pill', { hasText: 'In Progress' }).click();
      await page.locator('.fm-footer button.btn.btn-primary', { hasText: 'Save' }).click();

      await page.locator('button.btn', { hasText: 'Close' }).click();
    });

    // ── 3. Encoder submits for review: in-progress → pending-review ──
    await test.step('Encoder submits task for review', async () => {
      const card = page.locator('.task-card', { has: page.locator('.tc-name', { hasText: taskTitle }) });
      await card.click();
      await page.locator('button.btn.btn-primary', { hasText: 'Update Progress' }).click();

      await page.locator('button.filter-pill', { hasText: 'Pending Review' }).click();
      await page.locator('.fm-footer button.btn.btn-primary', { hasText: 'Save' }).click();

      await page.locator('button.btn', { hasText: 'Close' }).click();
      await logout(page, 'Encoder');
    });

    // ── 4. Coordinator rejects (push back) the task ──
    await test.step('Coordinator rejects the task via push back', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');

      // Click task row → ViewModal
      await page.locator('table tbody tr', { hasText: taskTitle }).click();
      await page.locator('button.btn.btn-primary', { hasText: 'View More' }).click();

      // TaskView — click Reject
      await page.locator('button.tv-btn.tv-btn-danger-solid', { hasText: 'Reject' }).click();

      await page.locator('.tv-modal-textarea[placeholder*="Missing attachment"]').fill('Needs revision - incomplete details');
      await page.locator('.tv-modal-actions button.tv-btn.tv-btn-danger', { hasText: 'Reject' }).click();

      await waitForSuccessToast(page);
      await page.locator('button.tv-icon-btn[aria-label="Close"]').click();
      await page.locator('.view-modal-actions button.btn', { hasText: 'Close' }).click();
      await logout(page, 'Coordinator');
    });

    // ── 5. Encoder re-submits for review ──
    await test.step('Encoder re-submits for review', async () => {
      await login(page, ENCODER_ID, ENCODER_PW);
      await waitForDashboard(page, 'Encoder');
      await openSidebarTab(page, 'My Tasks');

      const card = page.locator('.task-card', { has: page.locator('.tc-name', { hasText: taskTitle }) });
      await card.click();
      await page.locator('button.btn.btn-primary', { hasText: 'Update Progress' }).click();

      await page.locator('button.filter-pill', { hasText: 'Pending Review' }).click();
      await page.locator('.fm-footer button.btn.btn-primary', { hasText: 'Save' }).click();

      await page.locator('button.btn', { hasText: 'Close' }).click();
      await logout(page, 'Encoder');
    });

    // ── 6. Coordinator approves the task ──
    await test.step('Coordinator approves the task', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');

      await page.locator('table tbody tr', { hasText: taskTitle }).click();

      // Status is "Pending Admin Review" — click "Review Task"
      await page.locator('button.btn.btn-primary', { hasText: 'Review Task' }).click();

      // TaskReviewModal: select approve decision
      await page.locator('select.report-select').selectOption('Approve & Close');
      await page.locator('button.btn.btn-primary', { hasText: 'Submit Review Decision' }).click();

      await waitForSuccessToast(page);
      await logout(page, 'Coordinator');
    });
  });

  test('hold and resume flow', async ({ page }) => {
    const taskTitle = `FSM Hold ${Date.now()}`;

    // ── Create a task ──
    await test.step('Coordinator creates a task', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);
      await fillTaskTitle(page, taskTitle);
      await fillTaskDescription(page, 'FSM hold test');
      await selectPriority(page, 'Low');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, ENCODER_ID);
      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    // ── Place on Hold ──
    await test.step('Coordinator places task on hold', async () => {
      await page.locator('table tbody tr', { hasText: taskTitle }).click();
      await page.locator('button.btn.btn-primary', { hasText: 'View More' }).click();

      await page.locator('button.tv-btn.tv-btn-outline', { hasText: 'Hold' }).click();
      await page.locator('.tv-modal-textarea[placeholder*="Reason for holding"]').fill('Waiting for input');
      await page.locator('button.tv-btn.tv-btn-warning', { hasText: 'Place On Hold' }).click();

      await page.waitForTimeout(1000);
      await expect(page.locator('.tv-meta-chip .tv-meta-label', { hasText: 'Status' }))
        .toBeVisible();

      await page.locator('button.tv-icon-btn[aria-label="Close"]').click();
      await page.locator('.view-modal-actions button.btn', { hasText: 'Close' }).click();
    });

    // ── Resume from Hold ──
    await test.step('Coordinator resumes the task', async () => {
      await page.locator('table tbody tr', { hasText: taskTitle }).click();
      await page.locator('button.btn.btn-primary', { hasText: 'View More' }).click();

      await page.locator('button.tv-btn.tv-btn-outline', { hasText: 'Resume' }).click();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      const deadlineStr = futureDate.toISOString().slice(0, 16);
      await page.locator('.tv-modal input[type="datetime-local"]').fill(deadlineStr);
      await page.locator('button.tv-btn.tv-btn-primary', { hasText: 'Resume Task' }).click();

      await page.waitForTimeout(1000);
      await page.locator('button.tv-icon-btn[aria-label="Close"]').click();
      await page.locator('.view-modal-actions button.btn', { hasText: 'Close' }).click();
      await logout(page, 'Coordinator');
    });
  });

  test('cancel flow', async ({ page }) => {
    const taskTitle = `FSM Cancel ${Date.now()}`;

    await test.step('Coordinator creates a task', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);
      await fillTaskTitle(page, taskTitle);
      await fillTaskDescription(page, 'FSM cancel test');
      await selectPriority(page, 'Medium');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, ENCODER_ID);
      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    await test.step('Coordinator cancels the task', async () => {
      await page.locator('table tbody tr', { hasText: taskTitle }).click();
      await page.locator('button.btn.btn-primary', { hasText: 'View More' }).click();

      await page.locator('button.tv-btn.tv-btn-outline-danger', { hasText: 'Cancel' }).click();
      await page.locator('.tv-modal-textarea[placeholder*="Reason for cancellation"]').fill('No longer needed');
      await page.locator('button.tv-btn.tv-btn-danger', { hasText: 'Cancel Task' }).click();

      await page.waitForTimeout(1000);
      await expect(page.locator('.tv-meta-chip')).toBeVisible();

      await logout(page, 'Coordinator');
    });
  });
});
