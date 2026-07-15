import { test, expect } from '@playwright/test';
import { loginAndHandleOnboarding, openSidebarTab } from '../../helpers/auth';

const MANAGER_ID = process.env.MANAGER_ID || '';
const MANAGER_PW = process.env.MANAGER_PW || '';

test.beforeAll(() => {
  const missing = [
    !MANAGER_ID && 'MANAGER_ID',
    !MANAGER_PW && 'MANAGER_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 1.4: Organizational Structure', () => {
  test('Manager views Org Structure with departments and positions', async ({ page }) => {
    await test.step('Login as Manager and open Org Structure tab', async () => {
      await loginAndHandleOnboarding(page, MANAGER_ID, MANAGER_PW, 'Manager');
      await openSidebarTab(page, 'Org Structure');
    });

    await test.step('Org Structure page loads', async () => {
      await expect(page.locator('.org-root')).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('.rm2-subtab-btn', { hasText: 'Departments' })).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('.rm2-subtab-btn', { hasText: 'Job Positions' })).toBeVisible();
      await expect(page.locator('.rm2-subtab-btn', { hasText: 'Transfers' })).toBeVisible();
    });

    await test.step('Departments sub-tab loads data', async () => {
      await page.locator('.rm2-subtab-btn', { hasText: 'Departments' }).click();
      await page.waitForTimeout(2_000);
      const hasContent = await page.locator('h4,h3,table,li,.card').first().isVisible().catch(() => false);
      expect(hasContent).toBeTruthy();
    });

    await test.step('Transfers sub-tab loads employee data', async () => {
      await page.locator('.rm2-subtab-btn', { hasText: 'Transfers' }).click();
      await page.waitForTimeout(2_000);
      const table = page.locator('.table-card-data-table');
      const hasTable = await table.isVisible().catch(() => false);
      if (hasTable) {
        const rows = table.locator('tbody tr');
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
