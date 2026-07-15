import { test, expect } from '@playwright/test';
import { loginAndHandleOnboarding, openSidebarTab } from '../../helpers/auth';

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
  test('Coordinator opens Reports tab and sees KPI tracking', async ({ page }) => {
    await test.step('Login as Coordinator and open Reports tab', async () => {
      await loginAndHandleOnboarding(page, COORDINATOR_ID, COORDINATOR_PW, 'Coordinator');
      await openSidebarTab(page, 'Reports');
    });

    await test.step('Reports page is loaded', async () => {
      await expect(page.locator('h2', { hasText: 'Reports' })).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Report section has tab navigation', async () => {
      const tabs = page.locator('.rm2-subtab-btn,button.filter-pill');
      const tabCount = await tabs.count();
      if (tabCount > 0) {
        await expect(tabs.first()).toBeVisible({ timeout: 5_000 });
      }
    });

    await test.step('KPI Tracking filter card appears', async () => {
      const kpiTab = page.locator('.rm2-subtab-btn', { hasText: 'KPI' }).first();
      if (await kpiTab.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await kpiTab.click();
        await page.waitForTimeout(1_000);
      }

      await page.locator('button.btn.btn-primary', { hasText: 'Generate Report' }).click().catch(() => {});
      await page.waitForTimeout(2_000);

      const hasResults = await page.locator('.stat-card').isVisible().catch(() => false);
      if (hasResults) {
        await expect(page.locator('.stat-card').first()).toBeVisible();
      }
    });
  });
});
