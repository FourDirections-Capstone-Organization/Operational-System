import { test, expect } from '@playwright/test';
import { login, waitForDashboard, waitForSuccessToast, openSidebarTab, completeOnboardingIfNeeded } from '../../helpers/auth';

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
    // ── 1. Login as Manager ──
    await test.step('Login as Manager and open Announcements tab', async () => {
      await login(page, MANAGER_ID, MANAGER_PW);
      await completeOnboardingIfNeeded(page, MANAGER_ID, MANAGER_PW);
      await waitForDashboard(page, 'Manager');
      await openSidebarTab(page, 'Announcements');
    });

    // ── 2. Verify empty state ──
    await test.step('Announcements section is visible', async () => {
      await expect(page.locator('h3', { hasText: 'Announcements' })).toBeVisible();
      await expect(page.locator('button.btn.btn-primary', { hasText: 'New Announcement' })).toBeVisible();
    });

    // ── 3. Create a new announcement ──
    await test.step('Manager creates a new announcement', async () => {
      await page.locator('button.btn.btn-primary', { hasText: 'New Announcement' }).click();
      await expect(page.locator('.fm-modal')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('.fm-modal h3', { hasText: 'New Announcement' })).toBeVisible();

      await page.locator('.field input[type="text"]').first().fill(ANN_TITLE);
      await page.locator('.field textarea').fill(ANN_CONTENT);

      const targetSelect = page.locator('.field select').first();
      await targetSelect.selectOption('Encoder');

      const dateInputs = page.locator('.field input[type="datetime-local"]');
      const now = new Date();
      const effectiveValue = now.toISOString().slice(0, 16);
      await dateInputs.first().fill(effectiveValue);

      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiryValue = future.toISOString().slice(0, 16);
      await dateInputs.last().fill(expiryValue);

      await page.locator('.fm-footer button.btn.btn-primary', { hasText: 'Publish' }).click();
      await waitForSuccessToast(page);
    });

    // ── 4. Verify announcement appears in the list ──
    await test.step('Announcement card appears with correct details', async () => {
      const card = page.locator('.card h4', { hasText: ANN_TITLE });
      await expect(card).toBeVisible({ timeout: 8_000 });

      const cardContainer = page.locator('.card').filter({ has: page.locator('h4', { hasText: ANN_TITLE }) });
      await expect(cardContainer.locator('text=' + ANN_CONTENT)).toBeVisible();

      await expect(cardContainer.locator('span.badge', { hasText: 'Encoder' })).toBeVisible();
    });

    // ── 5. Acknowledge the announcement ──
    await test.step('Manager acknowledges the announcement', async () => {
      const cardContainer = page.locator('.card').filter({ has: page.locator('h4', { hasText: ANN_TITLE }) });
      const ackBtn = cardContainer.locator('button.btn-sm', { hasText: 'Acknowledge' });
      await expect(ackBtn).toBeVisible({ timeout: 5_000 });
      await ackBtn.click();
      await page.waitForTimeout(1_500);

      await expect(cardContainer.locator('button.btn-sm', { hasText: 'Acknowledged' })).toBeVisible({ timeout: 5_000 });

      const badge = cardContainer.locator('span.badge').first();
      const badgeText = await badge.textContent();
      expect(badgeText?.trim()).toBe('1');
    });

    // ── 6. Add a comment ──
    await test.step('Manager adds a comment to the announcement', async () => {
      const cardContainer = page.locator('.card').filter({ has: page.locator('h4', { hasText: ANN_TITLE }) });
      const commentInput = cardContainer.locator('input[placeholder="Write a comment..."]');
      await expect(commentInput).toBeVisible({ timeout: 3_000 });
      await commentInput.fill(ANN_COMMENT);

      const sendBtn = cardContainer.locator('button.btn-primary.btn-sm');
      await sendBtn.click();
      await page.waitForTimeout(1_500);

      await expect(cardContainer.locator('text=' + ANN_COMMENT)).toBeVisible({ timeout: 5_000 });
    });
  });
});
