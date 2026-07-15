import { test, expect } from '@playwright/test';
import { login, waitForDashboard, openSidebarTab, completeOnboardingIfNeeded } from '../../helpers/auth';

const MANAGER_ID = process.env.MANAGER_ID || '';
const MANAGER_PW = process.env.MANAGER_PW || '';

test.beforeAll(() => {
  const missing = [
    !MANAGER_ID && 'MANAGER_ID',
    !MANAGER_PW && 'MANAGER_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 5.2: Audit Logging', () => {
  test('Manager views audit logs and filters them', async ({ page }) => {
    await test.step('Login as Manager and open Activity Logs tab', async () => {
      await login(page, MANAGER_ID, MANAGER_PW);
      await completeOnboardingIfNeeded(page, MANAGER_ID, MANAGER_PW);
      await waitForDashboard(page, 'Manager');
      await openSidebarTab(page, 'Activity Logs');
    });

    await test.step('Activity logs table is visible with entries', async () => {
      await expect(page.locator('h3', { hasText: /System Activity Logs/i })).toBeVisible({ timeout: 5_000 });
      const table = page.locator('.table-card-data-table');
      await expect(table).toBeVisible({ timeout: 8_000 });

      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThanOrEqual(1);

      const firstRow = rows.first();
      await expect(firstRow.locator('td')).toHaveCount(4, { timeout: 3_000 });
    });

    await test.step('Activity type filter works', async () => {
      const typeSelect = page.locator('.table-card-filter-bar select').first();
      if (await typeSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
        const options = await typeSelect.locator('option').allTextContents();
        expect(options.length).toBeGreaterThan(1);

        if (options.length > 1) {
          await typeSelect.selectOption({ index: 1 });
          await page.waitForTimeout(1_500);

          const filterBar = page.locator('button.btn.btn-sm', { hasText: 'Clear' });
          if (await filterBar.isVisible().catch(() => false)) {
            await filterBar.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    await test.step('Activity log entries show correct data', async () => {
      const table = page.locator('.table-card-data-table');
      const firstRowCells = table.locator('tbody tr').first().locator('td');
      const cellCount = await firstRowCells.count();
      expect(cellCount).toBeGreaterThanOrEqual(4);

      const dateCell = await firstRowCells.nth(0).textContent();
      expect(dateCell?.trim()).not.toBe('');

      const typeCell = await firstRowCells.nth(1).textContent();
      expect(typeCell?.trim()).not.toBe('');
    });
  });
});
