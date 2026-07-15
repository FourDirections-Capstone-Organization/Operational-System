import { test, expect } from '@playwright/test';
import { login, waitForDashboard, openSidebarTab, completeOnboardingIfNeeded } from '../../helpers/auth';
import {
  clickNewTask, fillTaskTitle, fillTaskDescription, selectPriority,
  selectClassification, submitTaskForm, selectSingleAssignee,
} from '../../helpers/task';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';

test.beforeAll(() => {
  const missing = [
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 4.1: Dashboards & Workload Tracking', () => {
  test('Coordinator sees dashboard metrics and workload table', async ({ page }) => {
    await test.step('Login as Coordinator and open Dashboard tab', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await completeOnboardingIfNeeded(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Dashboard');
    });

    await test.step('Dashboard metric cards are visible', async () => {
      await expect(page.locator('.stat-card')).toHaveCount(4, { timeout: 8_000 });
      await expect(page.locator('.stat-label', { hasText: 'ACTIVE' })).toBeVisible();
      await expect(page.locator('.stat-label', { hasText: 'OVERDUE' })).toBeVisible();
      await expect(page.locator('.stat-value').first()).toBeVisible();
    });

    await test.step('Workload summary table is visible', async () => {
      await expect(page.locator('text=Workload Summary per Employee')).toBeVisible({ timeout: 5_000 });
      const table = page.locator('.table-card-data-table');
      await expect(table).toBeVisible();
      const headers = await table.locator('thead th').allTextContents();
      expect(headers.join(' ')).toMatch(/EMPLOYEE|TOTAL|ACTIVE|COMPLETED|OVERDUE/);
    });

    await test.step('Date range filter pills work', async () => {
      const filterPills = page.locator('button.filter-pill');
      const count = await filterPills.count();
      if (count >= 4) {
        await filterPills.nth(0).click();
        await page.waitForTimeout(1_000);
        await expect(filterPills.nth(0)).toHaveClass(/active/);
      }
    });

    await test.step('Employee availability shows in task assignment', async () => {
      await openSidebarTab(page, 'Tasks');
      await clickNewTask(page);
      await fillTaskTitle(page, `Workload Test ${Date.now()}`);
      await fillTaskDescription(page, 'Testing employee availability in assignment');
      await selectPriority(page, 'Low');
      await selectClassification(page, 'Routine Daily Task');

      await expect(page.locator('.sr-eligible-row')).toHaveCount(1, { timeout: 5_000 });
      await expect(page.locator('.sr-eligible-row', { hasText: ENCODER_ID })).toBeVisible();

      await selectSingleAssignee(page, ENCODER_ID);
      await submitTaskForm(page);
    });
  });
});
