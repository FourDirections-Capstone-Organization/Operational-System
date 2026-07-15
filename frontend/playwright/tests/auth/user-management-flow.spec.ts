import { test, expect } from '@playwright/test';
import {
  loginAndHandleOnboarding,
  logout,
  waitForSuccessToast,
  openSidebarTab,
  openEmployeeDetail,
  confirmPasswordGate,
  NEW_PW,
} from '../../helpers/auth';

const MANAGER_ID = process.env.MANAGER_ID || '';
const MANAGER_PW = process.env.MANAGER_PW || '';
const COORDINATOR_ID = process.env.COORDINATOR_ID || '';
const COORDINATOR_PW = process.env.COORDINATOR_PW || '';
const ENCODER_ID = process.env.ENCODER_ID || '';
const ENCODER_PW = process.env.ENCODER_PW || '';

const NEW_EMP_EMAIL = `e2e.test.${Date.now()}@stars.com`;
const NEW_EMP_CONTACT = '09179876543';

test.beforeAll(() => {
  const missing = [
    !MANAGER_ID && 'MANAGER_ID',
    !MANAGER_PW && 'MANAGER_PW',
    !COORDINATOR_ID && 'COORDINATOR_ID',
    !COORDINATOR_PW && 'COORDINATOR_PW',
    !ENCODER_ID && 'ENCODER_ID',
    !ENCODER_PW && 'ENCODER_PW',
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
});

test.describe('Flow 1: Authentication & User Management', () => {
  test('complete authentication and user management flow', async ({ page }) => {
    // ── 1. Login as Manager ──
    await test.step('Login as Manager', async () => {
      await loginAndHandleOnboarding(page, MANAGER_ID, MANAGER_PW, 'Manager');
      await expect(page.locator('.sidebar-role-badge')).toContainText('MANAGER');
    });

    // ── 2. Manager creates a new employee (FR-001) ──
    await test.step('Manager creates a new employee', async () => {
      await openSidebarTab(page, 'Manage Employee');

      const addBtn = page.locator('button', { hasText: 'Add Employee' });
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
      await expect(page.locator('h3', { hasText: 'Add New Employee' })).toBeVisible({ timeout: 5_000 });

      await page.locator('#emp-email').fill(NEW_EMP_EMAIL);
      await page.locator('#emp-contact').fill(NEW_EMP_CONTACT);

      await page.locator('#emp-dept').selectOption({ index: 1 });
      await page.waitForTimeout(500);

      const posSelect = page.locator('#emp-position');
      const posOptions = await posSelect.locator('option').all();
      if (posOptions.length > 1) {
        await posSelect.selectOption({ index: 1 });
      }

      const roleSelect = page.locator('#emp-role');
      await roleSelect.selectOption('Encoder');

      await page.locator('button.fm-btn.fm-btn-primary', { hasText: 'Register Employee' }).click();
      await page.waitForTimeout(3_000);
    });

    // ── 3. Login as Coordinator ──
    await test.step('Login as Coordinator', async () => {
      await logout(page, 'Manager');
      await loginAndHandleOnboarding(page, COORDINATOR_ID, COORDINATOR_PW, 'Coordinator');
      await expect(page.locator('.profile-role')).toContainText('COORDINATOR');
      await logout(page, 'Coordinator');
    });

    // ── 4. Login as Encoder ──
    await test.step('Login as Encoder', async () => {
      await loginAndHandleOnboarding(page, ENCODER_ID, ENCODER_PW, 'Encoder');
      await expect(page.locator('.profile-role')).toContainText('ENCODER');
    });

    // ── 5. Encoder updates their profile ──
    await test.step('Encoder updates their profile', async () => {
      await openSidebarTab(page, 'Profile');

      await page.locator('button.btn.btn-primary.ph-edit-btn', { hasText: 'Edit Profile' }).click();

      const contactInput = page.locator('input[type="tel"][placeholder="e.g. 09170000000"]');
      await contactInput.fill('09171234567');

      await page.locator('.card-header-layout button.btn.btn-primary', { hasText: 'Save' }).click();

      await page.locator('.fm-card input[type="password"]').fill(NEW_PW);
      await page.locator('button.btn.btn-primary', { hasText: 'Confirm & Save' }).click();

      await waitForSuccessToast(page);
    });

    // ── 6. Encoder logs out ──
    await test.step('Encoder logs out', async () => {
      await logout(page, 'Encoder');
    });

    // ── 7. Manager deactivates Encoder ──
    await test.step('Manager deactivates Encoder', async () => {
      await loginAndHandleOnboarding(page, MANAGER_ID, MANAGER_PW, 'Manager');

      await openSidebarTab(page, 'Manage Employee');

      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill(ENCODER_ID);
      await page.waitForTimeout(500);

      await openEmployeeDetail(page, ENCODER_ID);

      await page.locator('button.ed-btn.ed-btn-secondary', { hasText: 'Edit Profile' }).click();

      const nameInput = page.locator('.fm-card input.fm-input').first();
      const currentName = await nameInput.inputValue();
      if (currentName) {
        await nameInput.fill(currentName);
      }

      const statusSelect = page.locator('.fm-card select.fm-select').last();
      await statusSelect.selectOption('Deactivated');

      await page.locator('button.fm-btn.fm-btn-primary', { hasText: 'Save Changes' }).click();

      await confirmPasswordGate(page, NEW_PW, 'Verify & proceed');

      await waitForSuccessToast(page);

      await page.locator('button.ed-btn.ed-btn-ghost', { hasText: 'Back to Employees' }).click();
      await logout(page, 'Manager');
    });

    // ── 8. Encoder sees locked page ──
    await test.step('Encoder is redirected to account_locked', async () => {
      await page.goto('/');
      await page.locator('#employeeId').fill(ENCODER_ID);
      await page.locator('#password').fill(NEW_PW);
      await page.locator('button.submit-btn').click();
      await page.waitForURL('**/account_locked', { timeout: 10_000 });
      await expect(page.locator('.locked-label')).toContainText('ACCOUNT LOCKED');
      await expect(page.locator('.locked-text')).toContainText('deactivated');
    });

    // ── 9. Manager reactivates Encoder ──
    await test.step('Manager reactivates Encoder', async () => {
      await loginAndHandleOnboarding(page, MANAGER_ID, MANAGER_PW, 'Manager');

      await openSidebarTab(page, 'Manage Employee');

      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await searchInput.fill(ENCODER_ID);
      await page.waitForTimeout(500);

      await openEmployeeDetail(page, ENCODER_ID);

      await page.locator('button.ed-btn.ed-btn-ghost', { hasText: 'Activate' }).click();

      await confirmPasswordGate(page, NEW_PW, 'Verify & proceed');

      await waitForSuccessToast(page);

      await page.locator('button.ed-btn.ed-btn-ghost', { hasText: 'Back to Employees' }).click();
      await logout(page, 'Manager');
    });

    // ── 10. Encoder can access dashboard again ──
    await test.step('Encoder can login and access dashboard', async () => {
      await loginAndHandleOnboarding(page, ENCODER_ID, ENCODER_PW, 'Encoder');
      await expect(page.locator('.profile-role')).toContainText('ENCODER');
    });
  });
});
