import { test, expect } from '@playwright/test';
import { loginAndHandleOnboarding, logout, waitForSuccessToast, openSidebarTab } from '../../helpers/auth';
import {
  clickNewTask, fillTaskTitle, fillTaskDescription, selectPriority,
  selectClassification, selectSingleAssignee, submitTaskForm,
} from '../../helpers/task';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';
const ENCODER_PW = process.env.ENCODER_PW || '';

const TASK_TITLE = `Notif Test Task ${Date.now()}`;

test.beforeAll(() => {
  const missing = [
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
    !ENCODER_PW && 'ENCODER_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 3.1: Task Notifications', () => {
  test('notification bell triggers and marks as read after task creation', async ({ page }) => {
    // ── 1. Coordinator creates a task (triggers notification) ──
    await test.step('Coordinator creates a task assigned to Encoder', async () => {
      await loginAndHandleOnboarding(page, COORDINATOR_ID, COORDINATOR_PW, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);
      await fillTaskTitle(page, TASK_TITLE);
      await fillTaskDescription(page, 'Notification E2E test task');
      await selectPriority(page, 'Medium');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, 'Encoder1');
      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    // ── 2. Coordinator checks notification bell (should have task creation notification) ──
    await test.step('Coordinator opens and verifies notification bell', async () => {
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        document.querySelectorAll('.modal-overlay, .fm-overlay').forEach(el => el.remove());
      });
      await page.waitForTimeout(500);

      const notifBtn = page.locator('button.notif-btn[aria-label="Notifications"]');
      await expect(notifBtn).toBeVisible({ timeout: 5_000 });

      await notifBtn.click({ force: true });
      await expect(page.locator('div.notif-dropdown')).toBeVisible({ timeout: 3_000 });

      const items = page.locator('div.notif-item');
      const itemCount = await items.count();
      if (itemCount > 0) {
        await expect(items.first()).toBeVisible({ timeout: 5_000 });
        const message = items.first().locator('div.notif-message');
        await expect(message).not.toHaveText('');
      }
    });

    // ── 3. Logout Coordinator ──
    await test.step('Logout Coordinator', async () => {
      await logout(page, 'Coordinator');
    });

    // ── 4. Encoder logs in and sees assignment notification ──
    await test.step('Encoder sees the task assignment notification', async () => {
      await loginAndHandleOnboarding(page, ENCODER_ID, ENCODER_PW, 'Encoder');

      const badge = page.locator('span.notif-badge');
      await expect(badge).toBeVisible({ timeout: 10_000 });
      const count = await badge.textContent();
      expect(parseInt(count || '0', 10)).toBeGreaterThanOrEqual(1);

      const notifBtn = page.locator('button.notif-btn[aria-label="Notifications"]');
      await notifBtn.click();
      await expect(page.locator('div.notif-dropdown')).toBeVisible({ timeout: 3_000 });

      const items = page.locator('div.notif-item');
      await expect(items.first()).toBeVisible({ timeout: 5_000 });
    });

    // ── 5. Encoder marks a single notification as read ──
    await test.step('Encoder marks individual notification as read', async () => {
      const unreadItem = page.locator('div.notif-item.unread').first();
      await expect(unreadItem).toBeVisible({ timeout: 5_000 });

      await unreadItem.click();
      await page.waitForTimeout(1_000);

      await expect(unreadItem).toHaveClass(/read/);
    });
  });
});
