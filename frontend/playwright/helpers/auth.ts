import { Page, expect } from '@playwright/test';

export async function login(page: Page, employeeId: string, password: string) {
  await page.goto('/');
  await page.locator('#employeeId').fill(employeeId);
  await page.locator('#password').fill(password);
  await page.locator('button.submit-btn').click();

  await page.waitForURL(/\/onboarding|\/set-password|\/SystemAdmin|\/OpAdmin|\/OpEmployee/, { timeout: 15_000 });
}

const NEW_TEST_PASSWORD = 'E2eTest@2024!StrongPass';

async function tryApiOnboarding(page: Page, employeeId: string, currentPassword: string): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  if (!token) return false;

  const resp = await page.request.post('/api/Auth/change-password', {
    headers: { Authorization: `Bearer ${token}` },
    data: { currentPassword, newPassword: NEW_TEST_PASSWORD, confirmPassword: NEW_TEST_PASSWORD },
  });
  const body = await resp.json() as any;
  if (!body.isSuccess) return false;

  await page.evaluate(() => localStorage.setItem('isPasswordChanged', 'true'));
  await page.goto('/');
  await page.locator('#employeeId').fill(employeeId);
  await page.locator('#password').fill(NEW_TEST_PASSWORD);
  await page.locator('button.submit-btn').click();
  await page.waitForURL(/\/(SystemAdmin|OpAdmin|OpEmployee)/, { timeout: 15_000 });
  return true;
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

export async function completeOnboardingIfNeeded(page: Page, employeeId: string, currentPassword: string) {
  const url = page.url();
  if (!url.includes('/onboarding') && !url.includes('/set-password')) {
    return;
  }

  const done = await tryApiOnboarding(page, employeeId, currentPassword);
  if (done) return;

  await page.waitForURL('**/onboarding**', { timeout: 10_000 });

  const allInputs = page.locator('input');
  const totalInputs = await allInputs.count();

  if (totalInputs > 0) {
    for (let i = 0; i < Math.min(totalInputs, 5); i++) {
      const val = await allInputs.nth(i).inputValue();
      if (val === '') {
        if (i === 0) await allInputs.nth(i).fill('E2E');
        else if (i === 1) await allInputs.nth(i).fill('TestUser');
        else if (i === 4) await allInputs.nth(i).fill('09171234567');
      }
    }
    const btn = page.locator('button', { hasText: /Save.*Continue/ });
    if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(2_000);
    }
  }

  const pwInputs = page.locator('input[type="password"]');
  if ((await pwInputs.count()) >= 3) {
    await pwInputs.nth(0).fill(currentPassword);
    await pwInputs.nth(1).fill(NEW_TEST_PASSWORD);
    await pwInputs.nth(2).fill(NEW_TEST_PASSWORD);
    await page.locator('button', { hasText: /Set Password/ }).click();
    await page.waitForURL(/\/(SystemAdmin|OpAdmin|OpEmployee)/, { timeout: 15_000 });
  }
}
