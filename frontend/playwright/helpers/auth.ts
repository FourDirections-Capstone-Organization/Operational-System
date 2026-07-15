import { Page, expect } from '@playwright/test';

export async function login(page: Page, employeeId: string, password: string) {
  await page.goto('/');
  await page.locator('#employeeId').fill(employeeId);
  await page.locator('#password').fill(password);
  await page.locator('button.submit-btn').click();
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
  await page.locator('.nav-item', { has: page.locator('.nav-item-label', { hasText: label }) }).click();
}

export async function openEmployeeDetail(page: Page, employeeId: string) {
  const row = page.locator('table tbody tr', { hasText: employeeId });
  await row.click();
}

export async function confirmPasswordGate(page: Page, password: string, confirmLabel: string) {
  await page.locator('#gate-pw-input').fill(password);
  await page.locator('.cm-btn.cm-btn-confirm', { hasText: confirmLabel }).click();
}
