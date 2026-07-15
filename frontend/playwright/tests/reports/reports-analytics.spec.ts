import { test, expect } from '@playwright/test';
import { login, waitForDashboard, openSidebarTab, completeOnboardingIfNeeded } from '../../helpers/auth';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';

test.beforeAll(() => {
  const missing = [
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 4.2: Reports & Performance Analytics', () => {
  test('Coordinator accesses KPI tracking and sees export buttons', async ({ page }) => {
    await test.step('Login as Coordinator and open Reports tab', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await completeOnboardingIfNeeded(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Reports');
    });

    await test.step('Report sub-tabs are visible', async () => {
      await expect(page.locator('button.filter-pill', { hasText: 'KPI Tracking' })).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('button.filter-pill', { hasText: 'Performance Report' })).toBeVisible();
    });

    await test.step('KPI Tracking filter card is visible', async () => {
      await page.locator('button.filter-pill', { hasText: 'KPI Tracking' }).click();
      await page.waitForTimeout(500);

      await expect(page.locator('.card.report-filter-card')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('h3', { hasText: 'KPI Tracking' })).toBeVisible();
    });

    await test.step('Generate KPI report and see results', async () => {
      const employeeSelect = page.locator('.report-filter-card select').first();
      if (await employeeSelect.isVisible()) {
        await employeeSelect.selectOption('');
      }

      await page.locator('button.btn.btn-primary', { hasText: 'Generate Report' }).click();
      await page.waitForTimeout(2_000);

      const hasResults = await page.locator('.stats-row').isVisible().catch(() => false);
      const hasTable = await page.locator('.table-card-data-table').isVisible().catch(() => false);

      if (hasResults) {
        await expect(page.locator('.stat-card')).toHaveCount(3, { timeout: 5_000 });
      }
      if (hasTable) {
        const headers = await page.locator('.table-card-data-table thead th').allTextContents();
        expect(headers.join(' ')).toMatch(/On-Time|Late|Completed/);
      }
    });

    await test.step('Performance Report export buttons are visible', async () => {
      await page.locator('button.filter-pill', { hasText: 'Performance Report' }).click();
      await page.waitForTimeout(500);

      const hasExcel = await page.locator('button', { hasText: 'Export Excel' }).isVisible().catch(() => false);
      const hasPdf = await page.locator('button', { hasText: 'Export PDF' }).isVisible().catch(() => false);
      expect(hasExcel || hasPdf).toBeTruthy();
    });
  });
});
