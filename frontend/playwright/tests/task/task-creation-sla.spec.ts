import { test, expect } from '@playwright/test';
import { login, logout, waitForDashboard, waitForSuccessToast, openSidebarTab } from '../../helpers/auth';
import {
  clickNewTask, fillTaskTitle, fillTaskDescription, selectPriority,
  selectClassification, selectSingleAssignee, submitTaskForm,
  verifyTaskInTable, verifyTaskCard,
} from '../../helpers/task';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';
const ENCODER_PW = process.env.ENCODER_PW || '';
const MANAGER_ID = process.env.MANAGER_ID || '';
const MANAGER_PW = process.env.MANAGER_PW || '';

const TASK_TITLE = `E2E Test Task ${Date.now()}`;
const TASK_DESC = 'Automated test for task creation and SLA enforcement';

test.beforeAll(() => {
  const missing = [
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
    !ENCODER_PW && 'ENCODER_PW',
    !MANAGER_ID && 'MANAGER_ID',
    !MANAGER_PW && 'MANAGER_PW',
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
});

test.describe('Flow 2.1: Task Creation & SLA Enforcement', () => {
  test('complete task creation and visibility flow', async ({ page }) => {

    // ── 1. Coordinator creates a Critical task ──
    await test.step('Coordinator creates a Critical task with SLA lock', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');

      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);

      await fillTaskTitle(page, TASK_TITLE);
      await fillTaskDescription(page, TASK_DESC);

      // Set priority to Critical → SLA deadline should lock
      await selectPriority(page, 'Critical');

      const dueInput = page.locator('.modal-card input[type="datetime-local"]');
      await expect(dueInput).toHaveClass(/input-sla-locked/);
      await expect(dueInput).toBeDisabled({ timeout: 3_000 });
      await expect(page.locator('.modal-card', { hasText: /SLA enforced/ })).toBeVisible();

      // Set classification
      await selectClassification(page, 'Routine Daily Task');

      // Assignment is SingleEmployee by default — select encoder
      await selectSingleAssignee(page, ENCODER_ID);

      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    // ── 2. Encoder sees the task in My Tasks ──
    await test.step('Encoder can see the assigned task', async () => {
      await logout(page, 'Coordinator');
      await login(page, ENCODER_ID, ENCODER_PW);
      await waitForDashboard(page, 'Encoder');

      await openSidebarTab(page, 'My Tasks');
      await verifyTaskCard(page, TASK_TITLE);
    });

    // ── 3. Manager sees the task in Task Management ──
    await test.step('Manager can see the task in Task Management', async () => {
      await logout(page, 'Encoder');
      await login(page, MANAGER_ID, MANAGER_PW);
      await waitForDashboard(page, 'Manager');

      await openSidebarTab(page, 'Task Management');
      await verifyTaskInTable(page, TASK_TITLE);
    });
  });
});
