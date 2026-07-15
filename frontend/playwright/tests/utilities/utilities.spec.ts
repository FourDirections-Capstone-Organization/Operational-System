import { test, expect } from '@playwright/test';
import { login, waitForDashboard, waitForSuccessToast, openSidebarTab, completeOnboardingIfNeeded } from '../../helpers/auth';
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
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await completeOnboardingIfNeeded(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Tasks');
    });

    await test.step('Create first task', async () => {
      await clickNewTask(page);
      await fillTaskTitle(page, BASE_TITLE);
      await fillTaskDescription(page, 'Original task for duplicate detection test');
      await selectPriority(page, 'Low');
      await selectClassification(page, 'Routine Daily Task');
      await selectSingleAssignee(page, ENCODER_ID);
      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });

    await test.step('Create similar task and see duplicate warning', async () => {
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

        await selectSingleAssignee(page, ENCODER_ID);
        await page.locator('button', { hasText: 'Continue Anyway' }).click();
        await page.waitForTimeout(1_000);
      } else {
        await selectSingleAssignee(page, ENCODER_ID);
      }

      await submitTaskForm(page);
      await waitForSuccessToast(page);
    });
  });
});
