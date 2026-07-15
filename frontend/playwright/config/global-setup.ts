import { FullConfig } from '@playwright/test';

const NEW_PW = 'E2eTest@2024!StrongPass';

const ACCOUNTS = [
  { id: 'MGR001', pw: 'Manager@2024!Temp', role: 'Manager' },
  { id: 'CRD001', pw: 'Test@2024!Pass', role: 'Coordinator' },
  { id: 'ENC001', pw: 'Test@2024!Pass', role: 'Encoder' },
];

interface LoginResponse {
  isSuccess: boolean;
  data?: { accessToken: string };
}

async function loginAndChangePassword(baseURL: string, empId: string, oldPw: string) {
  const loginRes = await fetch(`${baseURL}/api/Auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: empId, password: oldPw }),
  });
  const loginBody: LoginResponse = await loginRes.json();

  if (!loginBody.isSuccess || !loginBody.data) {
    console.log(`  ⚠  ${empId}: login failed (may already be setup), skipping`);
    return;
  }

  const token = loginBody.data.accessToken;
  const changeRes = await fetch(`${baseURL}/api/Auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword: oldPw,
      newPassword: NEW_PW,
      confirmPassword: NEW_PW,
    }),
  });
  const changeBody = await changeRes.json();

  if (changeBody.isSuccess) {
    console.log(`  ✓  ${empId}: password changed → isPasswordChanged=true`);
  } else {
    console.log(`  ✗  ${empId}: change failed — ${changeBody.message || 'unknown'}`);
  }
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost';

  console.log('\n[Global Setup] Pre-configuring test accounts...');

  for (const acct of ACCOUNTS) {
    await loginAndChangePassword(baseURL, acct.id, acct.pw);
  }

  console.log('[Global Setup] Complete\n');
}
