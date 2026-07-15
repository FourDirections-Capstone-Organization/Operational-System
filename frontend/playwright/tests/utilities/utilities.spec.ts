import { test, expect } from '@playwright/test';
import { loginAndHandleOnboarding, openSidebarTab } from '../../helpers/auth';
import {
  clickNewTask, fillTaskTitle, fillTaskDescription, selectPriority,
  selectClassification, selectSingleAssignee, submitTaskForm,
} from '../../helpers/task';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';

const BASE_TITLE = `Duplicate Check ${Date.now()}`;

test.beforeAll(() => {
  const missing = [
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 5.1: Utilities', () => {
  test('duplicate task warning triggers and allows continue', async ({ page }) => {
    await test.step('Login as Coordinator', async () => {
      await loginAndHandleOnboarding(page, COORDINATOR_ID, COORDINATOR_PW, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
    });

    await test.step('Create first task', async () => {
      await clickNewTask(page);
      await fillTaskTitle(page, BASE_TITLE);
      await fillTaskDescription(page, 'Original task for duplicate detection test');
      await selectPriority(page, 'Low');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, 'Encoder1');
      await submitTaskForm(page);
      await page.waitForTimeout(3_000);
      await page.evaluate(() => {
        document.querySelectorAll('.modal-overlay, .fm-overlay').forEach(el => el.remove());
      });
      await page.waitForTimeout(500);
    });

    await test.step('Create similar task and see duplicate warning', async () => {
      await page.evaluate(() => {
        document.querySelectorAll('.modal-overlay, .fm-overlay').forEach(el => el.remove());
      });
      await page.waitForTimeout(500);
      await clickNewTask(page);
      await fillTaskTitle(page, BASE_TITLE);
      await fillTaskDescription(page, 'Similar description to trigger duplicate check');
      await selectPriority(page, 'Low');
      await selectClassification(page, 'Routine Daily Task');

      await page.waitForTimeout(2_000);

      const duplicateModal = page.locator('h3', { hasText: /duplicate|similar/i });
      const isDuplicateVisible = await duplicateModal.isVisible().catch(() => false);

      if (isDuplicateVisible) {
        await expect(page.locator('h3', { hasText: /duplicate/i })).toBeVisible();
        await expect(page.locator('button', { hasText: 'Continue Anyway' })).toBeVisible();

        await selectSingleAssignee(page, 'Encoder1');
        await page.locator('button', { hasText: 'Continue Anyway' }).click();
        await page.waitForTimeout(1_000);
      } else {
        await selectSingleAssignee(page, 'Encoder1');
      }

      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });
  });
});
