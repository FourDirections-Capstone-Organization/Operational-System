import { test, expect } from '@playwright/test';
import { loginAndHandleOnboarding, waitForSuccessToast, openSidebarTab } from '../../helpers/auth';

const MANAGER_ID = process.env.MANAGER_ID || '';
const MANAGER_PW = process.env.MANAGER_PW || '';

const ANN_TITLE = `E2E Test Announcement ${Date.now()}`;
const ANN_CONTENT = 'This is a test announcement created by Playwright E2E tests.';
const ANN_COMMENT = 'Acknowledged via automated test.';

test.beforeAll(() => {
  const missing = [
    !MANAGER_ID && 'MANAGER_ID',
    !MANAGER_PW && 'MANAGER_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 3.2: Announcement & Bulletin Board', () => {
  test('Manager creates, acknowledges, and comments on an announcement', async ({ page }) => {
    await test.step('Login as Manager and open Announcements tab', async () => {
      await loginAndHandleOnboarding(page, MANAGER_ID, MANAGER_PW, 'Manager');
      await openSidebarTab(page, 'Announcements');
    });

    await test.step('Announcements section is visible', async () => {
      await expect(page.locator('h3', { hasText: 'Announcements' })).toBeVisible();
      await expect(page.locator('button.btn.btn-primary', { hasText: 'New Announcement' })).toBeVisible();
    });

    await test.step('Manager creates a new announcement', async () => {
      await page.locator('button', { hasText: 'New Announcement' }).click();
      await page.waitForTimeout(1_500);

      await page.locator('.field input[type="text"]').first().fill(ANN_TITLE);
      await page.locator('.field textarea').fill(ANN_CONTENT);

      const targetSelect = page.locator('.field select').first();
      await targetSelect.selectOption('Encoder');

      const dateInputs = page.locator('.field input[type="datetime-local"]');
      const now = new Date();
      await dateInputs.first().fill(now.toISOString().slice(0, 16));
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await dateInputs.last().fill(future.toISOString().slice(0, 16));

      await page.locator('button.btn.btn-primary', { hasText: 'Publish' }).click();
      await page.waitForTimeout(2_000);
    });

    await test.step('Announcement card appears with correct details', async () => {
      const card = page.locator('.card').filter({ has: page.locator('h4', { hasText: ANN_TITLE }) });
      await expect(card).toBeVisible({ timeout: 8_000 });
      await expect(card.locator('text=' + ANN_CONTENT)).toBeVisible();
    });

    await test.step('Manager acknowledges the announcement', async () => {
      const card = page.locator('.card').filter({ has: page.locator('h4', { hasText: ANN_TITLE }) });
      const ackBtn = card.locator('button.btn-sm', { hasText: 'Acknowledge' });
      await expect(ackBtn).toBeVisible({ timeout: 5_000 });
      await ackBtn.click();
      await page.waitForTimeout(2_000);
      await expect(card.locator('button.btn-sm', { hasText: 'Acknowledged' })).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Manager adds a comment to the announcement', async () => {
      const card = page.locator('.card').filter({ has: page.locator('h4', { hasText: ANN_TITLE }) });
      const commentInput = card.locator('input[placeholder="Write a comment..."]');
      await expect(commentInput).toBeVisible({ timeout: 3_000 });
      await commentInput.fill(ANN_COMMENT);

      const sendBtn = card.locator('button.btn-primary.btn-sm');
      await sendBtn.click();
      await page.waitForTimeout(2_000);
      await expect(card.locator('text=' + ANN_COMMENT)).toBeVisible({ timeout: 5_000 });
    });
  });
});
