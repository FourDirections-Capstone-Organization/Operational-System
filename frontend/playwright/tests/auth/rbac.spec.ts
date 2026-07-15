import { test, expect } from '@playwright/test';
import { loginAndHandleOnboarding, logout, openSidebarTab } from '../../helpers/auth';

const MANAGER_ID = process.env.MANAGER_ID || '';
const MANAGER_PW = process.env.MANAGER_PW || '';
const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';
const ENCODER_PW = process.env.ENCODER_PW || '';

test.beforeAll(() => {
  const missing = [
    !MANAGER_ID && 'MANAGER_ID',
    !MANAGER_PW && 'MANAGER_PW',
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
    !ENCODER_PW && 'ENCODER_PW',
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing env vars: ${missing.join(', ')}`);
});

test.describe('Flow 1.3: Role-Based Access Control', () => {
  test('roles enforce correct sidebar visibility (FR-009, FR-012)', async ({ page }) => {
    // ── 1. Manager has full access ──
    await test.step('Manager sees admin-only nav items', async () => {
      await loginAndHandleOnboarding(page, MANAGER_ID, MANAGER_PW, 'Manager');
      await expect(page.locator('.sidebar-role-badge')).toContainText('MANAGER');

      await expect(page.locator('.nav-item-label', { hasText: 'Manage Employee' })).toBeVisible();
      await expect(page.locator('.nav-item-label', { hasText: 'Activity Logs' })).toBeVisible();

      const hasCoordTasks = await page.locator('.nav-item-label', { hasText: 'Tasks' }).isVisible().catch(() => false);
      const hasEncoderTasks = await page.locator('.nav-item-label', { hasText: 'My Tasks' }).isVisible().catch(() => false);
      expect(hasCoordTasks).toBeFalsy();
      expect(hasEncoderTasks).toBeFalsy();

      await logout(page, 'Manager');
    });

    // ── 2. Coordinator has management access ──
    await test.step('Coordinator sees management items but not admin items', async () => {
      await loginAndHandleOnboarding(page, COORDINATOR_ID, COORDINATOR_PW, 'Coordinator');
      await expect(page.locator('.profile-role')).toContainText('COORDINATOR');

      await expect(page.locator('.nav-item-label', { hasText: 'Tasks' })).toBeVisible();
      await expect(page.locator('.nav-item-label', { hasText: 'Team' })).toBeVisible();
      await expect(page.locator('.nav-item-label', { hasText: 'Reports' })).toBeVisible();

      const hasManageEmployee = await page.locator('.nav-item-label', { hasText: 'Manage Employee' }).isVisible().catch(() => false);
      expect(hasManageEmployee).toBeFalsy();

      await logout(page, 'Coordinator');
    });

    // ── 3. Encoder has personal access only ──
    await test.step('Encoder sees only personal items', async () => {
      await loginAndHandleOnboarding(page, ENCODER_ID, ENCODER_PW, 'Encoder');
      await expect(page.locator('.profile-role')).toContainText('ENCODER');

      await expect(page.locator('.nav-item-label', { hasText: 'My Tasks' })).toBeVisible();
      await expect(page.locator('.nav-item-label', { hasText: 'Profile' })).toBeVisible();
      await expect(page.locator('.nav-item-label', { hasText: 'Task Progress Review' })).toBeVisible();

      const hasTasks = await page.locator('.nav-item-label', { hasText: 'My Tasks' }).isVisible().catch(() => false);
      expect(hasTasks).toBeTruthy();
    });
  });
});
