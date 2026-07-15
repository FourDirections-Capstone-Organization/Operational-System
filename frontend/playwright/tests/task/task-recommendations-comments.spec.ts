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

test.describe('Flow 2.4: Recommendations & Comments', () => {
  const taskTitle = `E2E Recs&Comments ${Date.now()}`;

  test('coordinator adds recommendation and comment; encoder sees and adds comments', async ({ page }) => {
    // ── 0. Coordinator creates a task ──
    await test.step('Create a task for testing', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);
      await fillTaskTitle(page, taskTitle);
      await fillTaskDescription(page, 'Test for recommendations and comments');
      await selectPriority(page, 'Medium');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, ENCODER_ID);
      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    // ── 1. Coordinator adds a recommendation ──
    await test.step('Coordinator adds a recommendation', async () => {
      await page.locator('table tbody tr', { hasText: taskTitle }).click();
      await page.locator('button.btn.btn-primary', { hasText: 'View More' }).click();

      await page.locator('.tv-comments-toggle button', { hasText: 'Recommendations' }).click();

      await page.locator('select.tr-select').selectOption('WorkQuality');
      await page.locator('textarea.tr-textarea').fill('Good performance on this task');
      await page.locator('button.tr-submit-btn').click();

      await waitForSuccessToast(page);

      await expect(page.locator('.tr-list .tr-item')).toHaveCount(1);
    });

    // ── 2. Coordinator adds a comment ──
    await test.step('Coordinator adds a comment', async () => {
      await page.locator('.tv-comments-toggle button', { hasText: 'Comments' }).click();

      await page.locator('.tc-textarea').fill('Coordinator note: please review carefully');
      await page.locator('.tc-send-btn').click();

      await expect(page.locator('.tc-bubble-mine')).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Close TaskView', async () => {
      await page.locator('button.tv-icon-btn[aria-label="Close"]').click();
      await page.locator('.view-modal-actions button.btn', { hasText: 'Close' }).click();
      await logout(page, 'Coordinator');
    });

    // ── 3. Encoder sees comments and adds own ──
    await test.step('Encoder views and adds comments', async () => {
      await login(page, ENCODER_ID, ENCODER_PW);
      await waitForDashboard(page, 'Encoder');
      await openSidebarTab(page, 'My Tasks');

      const card = page.locator('.task-card', { has: page.locator('.tc-name', { hasText: taskTitle }) });
      await card.click();

      await page.locator('div', { hasText: 'Comments' }).first().click();

      await expect(page.locator('.tc-thread')).toBeVisible({ timeout: 5_000 });

      await page.locator('.tc-textarea').fill('Encoder: I have reviewed the task.');
      await page.locator('.tc-send-btn').click();

      await expect(page.locator('.tc-bubble-mine').last()).toBeVisible({ timeout: 5_000 });

      await page.locator('button.btn', { hasText: 'Close' }).click();
      await logout(page, 'Encoder');
    });
  });
});
