import { Page, expect } from '@playwright/test';

export interface TaskFormData {
  title: string;
  description: string;
  priority?: string;
  classification?: string;
  assigneeName?: string;
  isConfidential?: boolean;
}

export async function clickNewTask(page: Page) {
  await page.locator('button.btn.btn-primary', { has: page.locator('span', { hasText: 'New Task' }) }).click();
  await page.locator('.modal-card h3', { hasText: /Create New Task/ }).waitFor({ state: 'visible', timeout: 5_000 });
}

export async function fillTaskTitle(page: Page, title: string) {
  const input = page.locator('input[placeholder="e.g. Route planning update"]');
  await input.fill(title);
}

export async function fillTaskDescription(page: Page, description: string) {
  const textarea = page.locator('textarea[placeholder="Describe the task..."]');
  await textarea.fill(description);
}

export async function selectPriority(page: Page, priority: string) {
  const select = page.locator('.modal-card .field-row .field select').last();
  await select.selectOption(priority);
}

export async function selectClassification(page: Page, label: string) {
  await page.locator('label', { hasText: label }).click();
}

export async function selectSingleAssignee(page: Page, name: string) {
  const row = page.locator('.sr-eligible-row', { hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.click();
}

export async function fillTaskDueDate(page: Page, daysFromNow = 3) {
  const future = new Date();
  future.setDate(future.getDate() + daysFromNow);
  const dateStr = future.toISOString().slice(0, 16);
  await page.locator('.modal-card input[type="datetime-local"]').fill(dateStr);
}

export async function submitTaskForm(page: Page) {
  await page.locator('.modal-actions button.btn.btn-primary', { hasText: 'Save Changes' }).click();
}

export async function submitTaskAndConfirm(page: Page) {
  await page.locator('.modal-actions button.btn.btn-primary', { hasText: 'Save Changes' }).click();

  // Wait for either success toast or duplicate dialog
  const toastOrDialog = Promise.race([
    page.locator('.toast.toast-success').waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'toast'),
    page.locator('dialog', { hasText: /duplicate task/i }).waitFor({ state: 'visible', timeout: 15_000 }).then(() => 'dialog'),
  ]);

  const result = await toastOrDialog;
  if (result === 'dialog') {
    await page.locator('dialog', { hasText: /duplicate task/i }).locator('button', { hasText: 'Continue Anyway' }).click();
    // Now wait for the actual success toast after confirming
    await page.locator('.toast.toast-success').waitFor({ state: 'visible', timeout: 15_000 });
  }
}

export async function verifyTaskInTable(page: Page, title: string) {
  const row = page.locator('table tbody tr', { hasText: title });
  await expect(row).toBeVisible({ timeout: 10_000 });
}

export async function verifyTaskCard(page: Page, title: string) {
  const card = page.locator('.task-card', { has: page.locator('.tc-name', { hasText: title }) });
  await expect(card).toBeVisible({ timeout: 10_000 });
}
