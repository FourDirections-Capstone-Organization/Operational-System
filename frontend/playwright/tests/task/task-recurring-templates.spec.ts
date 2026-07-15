import { test, expect } from '@playwright/test';
import { login, logout, waitForDashboard, waitForSuccessToast, openSidebarTab } from '../../helpers/auth';

const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';

test.beforeAll(() => {
  if (!COORDINATOR_ID || !COORDINATOR_PW) throw new Error('Missing COORDINATOR_ID or COORDINATOR_PW');
});

test.describe('Flow 2.3: Recurring Task Automation', () => {
  const tmplName = `E2E Template ${Date.now()}`;
  const tmplTitle = `Auto-generated: Weekly check ${Date.now()}`;

  test('create, deploy, and manage a task template', async ({ page }) => {
    // ── 1. Create template ──
    await test.step('Coordinator creates a weekly task template', async () => {
      await login(page, COORDINATOR_ID, COORDINATOR_PW);
      await waitForDashboard(page, 'Coordinator');
      await openSidebarTab(page, 'Task Templates');

      await page.locator('button.btn.btn-primary', { has: page.locator('span', { hasText: 'Create Template' }) }).click();

      await page.locator('input.report-input[placeholder*="Weekly Warehouse"]').fill(tmplName);
      await page.locator('input.report-input[placeholder*="weekly warehouse"]').fill(tmplTitle);
      await page.locator('textarea.report-input[placeholder*="recurring task"]').fill('E2E test template description');

      await page.locator('select.report-select').first().selectOption('Low');

      const recurrenceSelect = page.locator('select.report-select').nth(1);
      await recurrenceSelect.selectOption('Weekly');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().slice(0, 10);
      await page.locator('input[type="date"]').fill(dateStr);

      await page.locator('button.filter-pill', { hasText: 'Active' }).click();

      await page.locator('button.btn.btn-primary', { hasText: 'Create Template' }).click();
      await waitForSuccessToast(page);
    });

    // ── 2. Verify template in table ──
    await test.step('Template appears in the table', async () => {
      await expect(page.locator('table tbody tr', { hasText: tmplName })).toBeVisible({ timeout: 10_000 });
    });

    // ── 3. Deploy Now ──
    await test.step('Deploy Now creates a task from template', async () => {
      const row = page.locator('table tbody tr', { hasText: tmplName });
      await row.locator('button.actions-dropdown-trigger').click();

      await page.locator('button.actions-dropdown-item', { hasText: 'Deploy Now' }).click();
      await waitForSuccessToast(page);
    });

    // ── 4. Verify task was created ──
    await test.step('Task appears in Tasks tab', async () => {
      await openSidebarTab(page, 'Tasks');

      const searchInput = page.locator('input[placeholder*="Search tasks"]');
      await searchInput.fill(tmplTitle);
      await page.waitForTimeout(500);

      await expect(page.locator('table tbody tr', { hasText: tmplTitle })).toBeVisible({ timeout: 10_000 });
    });

    // ── 5. Edit template ──
    await test.step('Edit template name', async () => {
      await openSidebarTab(page, 'Task Templates');

      const row = page.locator('table tbody tr', { hasText: tmplName });
      await row.locator('button.actions-dropdown-trigger').click();

      await page.locator('button.actions-dropdown-item', { hasText: 'Edit' }).click();

      const updatedName = `${tmplName} (edited)`;
      await page.locator('input.report-input[placeholder*="Weekly Warehouse"]').clear();
      await page.locator('input.report-input[placeholder*="Weekly Warehouse"]').fill(updatedName);

      await page.locator('button.btn.btn-primary', { hasText: 'Update Template' }).click();
      await waitForSuccessToast(page);

      await expect(page.locator('table tbody tr', { hasText: updatedName })).toBeVisible({ timeout: 10_000 });
    });

    await logout(page, 'Coordinator');
  });
});
