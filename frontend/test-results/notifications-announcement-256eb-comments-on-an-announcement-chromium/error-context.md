# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications\announcements.spec.ts >> Flow 3.2: Announcement & Bulletin Board >> Manager creates, acknowledges, and comments on an announcement
- Location: playwright\tests\notifications\announcements.spec.ts:20:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.nav-item').filter({ has: locator('.nav-item-label').filter({ hasText: 'Announcements' }) })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - img "Speedex Logo" [ref=e6]
      - generic [ref=e8]: MANAGER
      - navigation [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: MAIN MENU
          - generic [ref=e13] [cursor=pointer]:
            - img [ref=e14]
            - generic [ref=e19]: Dashboard
          - generic [ref=e20] [cursor=pointer]:
            - img [ref=e21]
            - generic [ref=e26]: Manage Employee
        - generic [ref=e27]:
          - generic [ref=e28]: INTEGRATION
          - generic [ref=e29] [cursor=pointer]:
            - img [ref=e30]
            - generic [ref=e33]: Delivery Summary
          - generic [ref=e34] [cursor=pointer]:
            - img [ref=e35]
            - generic [ref=e38]: Task Management
          - generic [ref=e39] [cursor=pointer]:
            - img [ref=e40]
            - generic [ref=e42]: Finance
        - generic [ref=e43]:
          - generic [ref=e44]: REPORTS
          - generic [ref=e45] [cursor=pointer]:
            - img [ref=e46]
            - generic [ref=e48]: Reports
        - generic [ref=e49]:
          - generic [ref=e50]: SYSTEM
          - generic [ref=e51] [cursor=pointer]:
            - img [ref=e52]
            - generic [ref=e55]: Settings
          - generic [ref=e56] [cursor=pointer]:
            - img [ref=e57]
            - generic [ref=e59]: Role Management
          - generic [ref=e60] [cursor=pointer]:
            - img [ref=e61]
            - generic [ref=e65]: Org Structure
          - generic [ref=e66] [cursor=pointer]:
            - img [ref=e67]
            - generic [ref=e69]: Activity Logs
      - generic [ref=e71]:
        - generic [ref=e72]: SM
        - generic [ref=e73]:
          - generic [ref=e74]: System Manager
          - generic [ref=e75]: MANAGER
        - button "Logout" [ref=e76] [cursor=pointer]:
          - img [ref=e77]
    - main [ref=e80]:
      - generic [ref=e81]:
        - heading "Dashboard" [level=2] [ref=e83]
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]: Speedex Courier Inc.
            - generic [ref=e87]: Wednesday, July 15, 2026
          - button "Notifications" [ref=e89] [cursor=pointer]:
            - img [ref=e90]
          - button "SM" [ref=e94] [cursor=pointer]:
            - generic [ref=e95]: SM
      - generic [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - img
            - textbox "Search employee, task…" [ref=e99]
          - button "Add Employee" [ref=e100] [cursor=pointer]:
            - img [ref=e102]
            - generic [ref=e107]: Add Employee
        - generic [ref=e108]:
          - generic [ref=e109]:
            - generic [ref=e110]:
              - img [ref=e112]
              - generic [ref=e118]: TOTAL EMPLOYEES
            - heading "8" [level=3] [ref=e119]
            - generic [ref=e120]: All registered staff
          - generic [ref=e121]:
            - generic [ref=e122]:
              - img [ref=e124]
              - generic [ref=e128]: ACTIVE
            - heading "8" [level=3] [ref=e129]
            - generic [ref=e130]: Currently active accounts
          - generic [ref=e131]:
            - generic [ref=e132]:
              - img [ref=e134]
              - generic [ref=e137]: DEACTIVATED
            - heading "0" [level=3] [ref=e138]
            - generic [ref=e139]: Accounts needing review
          - generic [ref=e140]:
            - generic [ref=e141]:
              - img [ref=e143]
              - generic [ref=e146]: ROLES
            - heading "6" [level=3] [ref=e147]
            - generic [ref=e148]: Available role types
        - generic [ref=e149]:
          - generic [ref=e150]:
            - generic [ref=e152] [cursor=pointer]: Role Distribution
            - application [ref=e155]:
              - generic [ref=e176]:
                - generic [ref=e177]:
                  - generic [ref=e179]: Courier
                  - generic [ref=e181]: Encoder
                - generic [ref=e182]:
                  - generic [ref=e184]: "0"
                  - generic [ref=e186]: "1"
                  - generic [ref=e188]: "2"
                  - generic [ref=e190]: "3"
                  - generic [ref=e192]: "4"
          - generic [ref=e193]:
            - generic [ref=e195] [cursor=pointer]: Account Status
            - generic [ref=e197]:
              - list [ref=e199]:
                - listitem [ref=e200]:
                  - img "Active legend icon" [ref=e201]
                  - generic [ref=e203]: Active
              - application [ref=e204]:
                - generic [ref=e213]: Active 100%
          - generic [ref=e214]:
            - generic [ref=e216] [cursor=pointer]:
              - img [ref=e217]
              - text: Avg Workload by Role
            - application [ref=e222]:
              - generic [ref=e242]:
                - generic [ref=e243]:
                  - generic [ref=e245]: "0"
                  - generic [ref=e247]: "2"
                  - generic [ref=e249]: "4"
                  - generic [ref=e251]: "6"
                  - generic [ref=e253]: "8"
                - generic [ref=e254]:
                  - generic [ref=e256]: Coordinator
                  - generic [ref=e258]: Courier
                  - generic [ref=e260]: Dispatcher
                  - generic [ref=e262]: Encoder
        - generic [ref=e263]:
          - generic [ref=e264]:
            - generic [ref=e265]:
              - generic [ref=e266] [cursor=pointer]: Recent Employees
              - button "View more →" [ref=e267] [cursor=pointer]
            - generic [ref=e268]:
              - generic [ref=e269] [cursor=pointer]:
                - generic [ref=e270]:
                  - generic [ref=e271]: T
                  - generic "Offline" [ref=e272]
                - generic [ref=e273]:
                  - generic [ref=e274]: Test Coordinator1
                  - generic [ref=e275]:
                    - generic [ref=e276]: CRD001
                    - generic [ref=e277]: Coordinator
                    - generic [ref=e278]: Active
                - generic [ref=e279]:
                  - button "View Details" [ref=e280]:
                    - img [ref=e281]
                  - button "Edit" [ref=e284]:
                    - img [ref=e285]
              - generic [ref=e288] [cursor=pointer]:
                - generic [ref=e289]:
                  - generic [ref=e290]: T
                  - generic "Offline" [ref=e291]
                - generic [ref=e292]:
                  - generic [ref=e293]: Test Coordinator2
                  - generic [ref=e294]:
                    - generic [ref=e295]: CRD002
                    - generic [ref=e296]: Coordinator
                    - generic [ref=e297]: Active
                - generic [ref=e298]:
                  - button "View Details" [ref=e299]:
                    - img [ref=e300]
                  - button "Edit" [ref=e303]:
                    - img [ref=e304]
              - generic [ref=e307] [cursor=pointer]:
                - generic [ref=e308]:
                  - generic [ref=e309]: T
                  - generic "Offline" [ref=e310]
                - generic [ref=e311]:
                  - generic [ref=e312]: Test Courier1
                  - generic [ref=e313]:
                    - generic [ref=e314]: CRS001
                    - generic [ref=e315]: Courier
                    - generic [ref=e316]: Active
                - generic [ref=e317]:
                  - button "View Details" [ref=e318]:
                    - img [ref=e319]
                  - button "Edit" [ref=e322]:
                    - img [ref=e323]
              - generic [ref=e326] [cursor=pointer]:
                - generic [ref=e327]:
                  - generic [ref=e328]: T
                  - generic "Offline" [ref=e329]
                - generic [ref=e330]:
                  - generic [ref=e331]: Test Courier2
                  - generic [ref=e332]:
                    - generic [ref=e333]: CRS002
                    - generic [ref=e334]: Courier
                    - generic [ref=e335]: Active
                - generic [ref=e336]:
                  - button "View Details" [ref=e337]:
                    - img [ref=e338]
                  - button "Edit" [ref=e341]:
                    - img [ref=e342]
              - generic [ref=e345] [cursor=pointer]:
                - generic [ref=e346]:
                  - generic [ref=e347]: T
                  - generic "Offline" [ref=e348]
                - generic [ref=e349]:
                  - generic [ref=e350]: Test Dispatcher1
                  - generic [ref=e351]:
                    - generic [ref=e352]: DSP001
                    - generic [ref=e353]: Dispatcher
                    - generic [ref=e354]: Active
                - generic [ref=e355]:
                  - button "View Details" [ref=e356]:
                    - img [ref=e357]
                  - button "Edit" [ref=e360]:
                    - img [ref=e361]
              - generic [ref=e364] [cursor=pointer]:
                - generic [ref=e365]:
                  - generic [ref=e366]: T
                  - generic "Offline" [ref=e367]
                - generic [ref=e368]:
                  - generic [ref=e369]: Test Dispatcher2
                  - generic [ref=e370]:
                    - generic [ref=e371]: DSP002
                    - generic [ref=e372]: Dispatcher
                    - generic [ref=e373]: Active
                - generic [ref=e374]:
                  - button "View Details" [ref=e375]:
                    - img [ref=e376]
                  - button "Edit" [ref=e379]:
                    - img [ref=e380]
              - generic [ref=e383] [cursor=pointer]:
                - generic [ref=e384]:
                  - generic [ref=e385]: T
                  - generic "Offline" [ref=e386]
                - generic [ref=e387]:
                  - generic [ref=e388]: Test Encoder1
                  - generic [ref=e389]:
                    - generic [ref=e390]: ENC001
                    - generic [ref=e391]: Encoder
                    - generic [ref=e392]: Active
                - generic [ref=e393]:
                  - button "View Details" [ref=e394]:
                    - img [ref=e395]
                  - button "Edit" [ref=e398]:
                    - img [ref=e399]
          - generic [ref=e402]:
            - generic [ref=e404] [cursor=pointer]: Recent Activity
            - generic [ref=e406]:
              - img [ref=e407]
              - paragraph [ref=e410]: No recent activity
  - generic [ref=e411]: "6"
```

# Test source

```ts
  1   | import { Page, expect } from '@playwright/test';
  2   | 
  3   | export async function login(page: Page, employeeId: string, password: string) {
  4   |   await page.goto('/');
  5   |   await page.locator('#employeeId').fill(employeeId);
  6   |   await page.locator('#password').fill(password);
  7   |   await page.locator('button.submit-btn').click();
  8   | 
  9   |   await page.waitForURL(/\/onboarding|\/set-password|\/SystemAdmin|\/OpAdmin|\/OpEmployee/, { timeout: 15_000 });
  10  | }
  11  | 
  12  | const NEW_TEST_PASSWORD = 'E2eTest@2024!StrongPass';
  13  | 
  14  | async function tryApiOnboarding(page: Page, employeeId: string, currentPassword: string): Promise<boolean> {
  15  |   const token = await page.evaluate(() => localStorage.getItem('authToken'));
  16  |   if (!token) return false;
  17  | 
  18  |   const resp = await page.request.post('/api/Auth/change-password', {
  19  |     headers: { Authorization: `Bearer ${token}` },
  20  |     data: { currentPassword, newPassword: NEW_TEST_PASSWORD, confirmPassword: NEW_TEST_PASSWORD },
  21  |   });
  22  |   const body = await resp.json() as any;
  23  |   if (!body.isSuccess) return false;
  24  | 
  25  |   await page.evaluate(() => localStorage.setItem('isPasswordChanged', 'true'));
  26  |   await page.goto('/');
  27  |   await page.locator('#employeeId').fill(employeeId);
  28  |   await page.locator('#password').fill(NEW_TEST_PASSWORD);
  29  |   await page.locator('button.submit-btn').click();
  30  |   await page.waitForURL(/\/(SystemAdmin|OpAdmin|OpEmployee)/, { timeout: 15_000 });
  31  |   return true;
  32  | }
  33  | 
  34  | export function getExpectedDashboard(role: string): string {
  35  |   const map: Record<string, string> = {
  36  |     Manager: '/SystemAdmin_Dashboard',
  37  |     Coordinator: '/OpAdmin_Dashboard',
  38  |     Encoder: '/OpEmployee_Dashboard',
  39  |     Dispatcher: '/OpEmployee_Dashboard',
  40  |     Courier: '/OpEmployee_Dashboard',
  41  |     Accountant: '/OpEmployee_Dashboard',
  42  |   };
  43  |   return map[role] ?? '/OpEmployee_Dashboard';
  44  | }
  45  | 
  46  | export async function waitForDashboard(page: Page, role: string) {
  47  |   const path = getExpectedDashboard(role);
  48  |   await page.waitForURL(`**${path}`, { timeout: 15_000 });
  49  | }
  50  | 
  51  | export async function logout(page: Page, role: string) {
  52  |   const logoutBtn = page.locator('button.profile-logout[aria-label="Logout"]');
  53  |   await logoutBtn.click();
  54  | 
  55  |   if (role === 'Manager') {
  56  |     await page.locator('.cm-btn.cm-btn-confirm', { hasText: 'Log out' }).click();
  57  |   }
  58  |   await page.waitForURL('**/', { timeout: 10_000 });
  59  | }
  60  | 
  61  | export async function waitForSuccessToast(page: Page) {
  62  |   const toast = page.locator('.toast.toast-success');
  63  |   await expect(toast).toBeVisible({ timeout: 10_000 });
  64  | }
  65  | 
  66  | export async function openSidebarTab(page: Page, label: string) {
> 67  |   await page.locator('.nav-item', { has: page.locator('.nav-item-label', { hasText: label }) }).click();
      |                                                                                                 ^ Error: locator.click: Test timeout of 60000ms exceeded.
  68  | }
  69  | 
  70  | export async function openEmployeeDetail(page: Page, employeeId: string) {
  71  |   const row = page.locator('table tbody tr', { hasText: employeeId });
  72  |   await row.click();
  73  | }
  74  | 
  75  | export async function confirmPasswordGate(page: Page, password: string, confirmLabel: string) {
  76  |   await page.locator('#gate-pw-input').fill(password);
  77  |   await page.locator('.cm-btn.cm-btn-confirm', { hasText: confirmLabel }).click();
  78  | }
  79  | 
  80  | export async function completeOnboardingIfNeeded(page: Page, employeeId: string, currentPassword: string) {
  81  |   const url = page.url();
  82  |   if (!url.includes('/onboarding') && !url.includes('/set-password')) {
  83  |     return;
  84  |   }
  85  | 
  86  |   const done = await tryApiOnboarding(page, employeeId, currentPassword);
  87  |   if (done) return;
  88  | 
  89  |   await page.waitForURL('**/onboarding**', { timeout: 10_000 });
  90  | 
  91  |   const allInputs = page.locator('input');
  92  |   const totalInputs = await allInputs.count();
  93  | 
  94  |   if (totalInputs > 0) {
  95  |     for (let i = 0; i < Math.min(totalInputs, 5); i++) {
  96  |       const val = await allInputs.nth(i).inputValue();
  97  |       if (val === '') {
  98  |         if (i === 0) await allInputs.nth(i).fill('E2E');
  99  |         else if (i === 1) await allInputs.nth(i).fill('TestUser');
  100 |         else if (i === 4) await allInputs.nth(i).fill('09171234567');
  101 |       }
  102 |     }
  103 |     const btn = page.locator('button', { hasText: /Save.*Continue/ });
  104 |     if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
  105 |       await btn.click();
  106 |       await page.waitForTimeout(2_000);
  107 |     }
  108 |   }
  109 | 
  110 |   const pwInputs = page.locator('input[type="password"]');
  111 |   if ((await pwInputs.count()) >= 3) {
  112 |     await pwInputs.nth(0).fill(currentPassword);
  113 |     await pwInputs.nth(1).fill(NEW_TEST_PASSWORD);
  114 |     await pwInputs.nth(2).fill(NEW_TEST_PASSWORD);
  115 |     await page.locator('button', { hasText: /Set Password/ }).click();
  116 |     await page.waitForURL(/\/(SystemAdmin|OpAdmin|OpEmployee)/, { timeout: 15_000 });
  117 |   }
  118 | }
  119 | 
```