import { Page, expect } from '@playwright/test';

export const NEW_PW = 'E2eTest@2024!StrongPass';

async function doLogin(page: Page, employeeId: string, password: string) {
  await page.goto('/');
  await page.locator('#employeeId').fill(employeeId);
  await page.locator('#password').fill(password);
  await page.locator('button.submit-btn').click();
  await page.waitForTimeout(2_000);
}

async function finalizePasswordChange(page: Page, employeeId: string, originalPassword: string) {
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  if (!token) return false;

  const resp = await page.request.post('/api/Auth/change-password', {
    headers: { Authorization: `Bearer ${token}` },
    data: { currentPassword: originalPassword, newPassword: NEW_PW, confirmPassword: NEW_PW },
  });
  const body = await resp.json() as any;
  if (!body.isSuccess) return false;

  await page.evaluate(() => localStorage.setItem('isPasswordChanged', 'true'));
  await doLogin(page, employeeId, NEW_PW);
  return true;
}

export async function loginAndHandleOnboarding(page: Page, employeeId: string, originalPassword: string, role: string) {
  await doLogin(page, employeeId, originalPassword);

  const url = page.url();

  // Case 1: Already on dashboard
  if (url.includes('/SystemAdmin') || url.includes('/OpAdmin') || url.includes('/OpEmployee')) {
    const path = getExpectedDashboard(role);
    await page.waitForURL(`**${path}`, { timeout: 15_000 });
    return;
  }

  // Case 2: Redirected to onboarding → change password via API
  if (url.includes('/onboarding') || url.includes('/set-password')) {
    const ok = await finalizePasswordChange(page, employeeId, originalPassword);
    if (ok) {
      const path = getExpectedDashboard(role);
      await page.waitForURL(`**${path}`, { timeout: 15_000 });
      return;
    }
  }

  // Case 3: Login failed (password already changed) → retry with new password
  await doLogin(page, employeeId, NEW_PW);
  const path = getExpectedDashboard(role);
  await page.waitForURL(`**${path}`, { timeout: 15_000 });
}

export function getExpectedDashboard(role: string): string {
  const map: Record<string, string> = {
    Manager: '/SystemAdmin_Dashboard',
    Coordinator: '/OpAdmin_Dashboard',
    Encoder: '/OpEmployee_Dashboard',
    Dispatcher: '/OpEmployee_Dashboard',
    Courier: '/OpEmployee_Dashboard',
    Accountant: '/OpEmployee_Dashboard',
  };
  return map[role] ?? '/OpEmployee_Dashboard';
}

export async function login(page: Page, employeeId: string, password: string) {
  await page.goto('/');
  await page.locator('#employeeId').fill(employeeId);
  await page.locator('#password').fill(password);
  await page.locator('button.submit-btn').click();
  await page.waitForTimeout(2_000);
}

export async function waitForDashboard(page: Page, role: string) {
  const path = getExpectedDashboard(role);
  await page.waitForURL(`**${path}`, { timeout: 15_000 });
}

export async function logout(page: Page, role: string) {
  const logoutBtn = page.locator('button.profile-logout[aria-label="Logout"]');
  await logoutBtn.click();

  if (role === 'Manager') {
    await page.locator('.cm-btn.cm-btn-confirm', { hasText: 'Log out' }).click();
  }
  await page.waitForURL('**/', { timeout: 10_000 });
}

export async function waitForSuccessToast(page: Page) {
  const toast = page.locator('.toast.toast-success');
  await expect(toast).toBeVisible({ timeout: 10_000 });
}

export async function openSidebarTab(page: Page, label: string) {
  await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.scrollTop = sidebar.scrollHeight;
  });
  await page.waitForTimeout(500);
  const item = page.locator('.nav-item-label', { hasText: label });
  await item.click({ force: true });
}

export async function openEmployeeDetail(page: Page, employeeId: string) {
  const row = page.locator('table tbody tr', { hasText: employeeId });
  await row.click();
}

export async function confirmPasswordGate(page: Page, password: string, confirmLabel: string) {
  await page.locator('#gate-pw-input').fill(password);
  await page.locator('.cm-btn.cm-btn-confirm', { hasText: confirmLabel }).click();
}
