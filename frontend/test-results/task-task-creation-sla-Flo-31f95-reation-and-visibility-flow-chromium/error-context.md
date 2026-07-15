# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: task\task-creation-sla.spec.ts >> Flow 2.1: Task Creation & SLA Enforcement >> complete task creation and visibility flow
- Location: playwright\tests\task\task-creation-sla.spec.ts:34:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button.profile-logout[aria-label="Logout"]')
    - locator resolved to <button title="Logout" aria-label="Logout" class="profile-logout">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="modal-overlay">…</div> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="modal-overlay">…</div> intercepts pointer events
    - retrying click action
      - waiting 100ms
    98 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="modal-overlay">…</div> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - img "Speedex Logo" [ref=e6]
      - generic [ref=e8]: COORDINATOR
      - navigation [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]: MAIN MENU
          - generic [ref=e13] [cursor=pointer]:
            - img [ref=e14]
            - generic [ref=e19]: Dashboard
          - generic [ref=e20] [cursor=pointer]:
            - img [ref=e21]
            - generic [ref=e25]: Tasks
          - generic [ref=e26] [cursor=pointer]:
            - img [ref=e27]
            - generic [ref=e32]: Team
        - generic [ref=e33]:
          - generic [ref=e34]: TEMPLATES
          - generic [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - generic [ref=e39]: Task Templates
        - generic [ref=e40]:
          - generic [ref=e41]: REPORTS
          - generic [ref=e42] [cursor=pointer]:
            - img [ref=e43]
            - generic [ref=e45]: Reports
        - generic [ref=e46]:
          - generic [ref=e47]: ACCOUNT
          - generic [ref=e48] [cursor=pointer]:
            - img [ref=e49]
            - generic [ref=e53]: Profile
          - generic [ref=e54] [cursor=pointer]:
            - img [ref=e55]
            - generic [ref=e57]: Activity Logs
      - generic [ref=e59]:
        - generic [ref=e61]: TC
        - generic [ref=e63]:
          - generic [ref=e64]: Test Coordinator1
          - generic [ref=e65]: COORDINATOR
        - button "Logout" [ref=e66] [cursor=pointer]:
          - img [ref=e67]
    - main [ref=e70]:
      - generic [ref=e71]:
        - heading "Task Management" [level=2] [ref=e73]
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]: Speedex Courier Inc.
            - generic [ref=e77]: Thursday, July 16, 2026
          - button "Notifications" [ref=e79] [cursor=pointer]:
            - img [ref=e80]
          - button "TC" [ref=e84] [cursor=pointer]:
            - generic [ref=e85]: TC
      - generic [ref=e87]:
        - generic [ref=e88]:
          - generic [ref=e89]:
            - generic [ref=e90]:
              - img [ref=e92]
              - generic [ref=e96]: Active
            - heading "9" [level=3] [ref=e97]
            - generic [ref=e98]: 9 tasks
          - generic [ref=e99]:
            - generic [ref=e100]:
              - img [ref=e102]
              - generic [ref=e105]: In Progress
            - heading "0" [level=3] [ref=e106]
            - generic [ref=e107]: Currently active
          - generic [ref=e108]:
            - generic [ref=e109]:
              - img [ref=e111]
              - generic [ref=e115]: Completed
            - heading "0" [level=3] [ref=e116]
            - generic [ref=e117]: 0% completion rate
          - generic [ref=e118]:
            - generic [ref=e119]:
              - img [ref=e121]
              - generic [ref=e124]: Overdue
            - heading "0" [level=3] [ref=e125]
            - generic [ref=e126]: No overdue tasks
        - generic [ref=e127]:
          - generic [ref=e128]:
            - button "Active 9" [ref=e129] [cursor=pointer]:
              - generic [ref=e131]: Active
              - generic [ref=e132]: "9"
            - button "Completed" [ref=e133] [cursor=pointer]:
              - generic [ref=e135]: Completed
            - button "Bin" [ref=e136] [cursor=pointer]:
              - generic [ref=e138]: Bin
          - heading "Task Manager" [level=3] [ref=e140]
          - generic [ref=e141]:
            - generic [ref=e143]: 9 results on this page
            - generic [ref=e144]:
              - generic [ref=e145]:
                - img
                - textbox "Search by task, assignee, project…" [ref=e146]
              - combobox [ref=e147] [cursor=pointer]:
                - option "All Priorities" [selected]
                - option "Urgent"
                - option "High"
                - option "Medium"
                - option "Low"
              - combobox [ref=e148] [cursor=pointer]:
                - option "All Classifications" [selected]
                - option "Routine Daily"
                - option "Special Task"
              - combobox [ref=e149] [cursor=pointer]:
                - option "All Assignees" [selected]
              - button "New Task" [ref=e150] [cursor=pointer]:
                - img [ref=e151]
                - generic [ref=e152]: New Task
          - table [ref=e154]:
            - rowgroup [ref=e155]:
              - row "# Task Assignee Priority Due Date Status" [ref=e156]:
                - columnheader [ref=e157]
                - columnheader "#" [ref=e158]
                - columnheader "Task" [ref=e159]
                - columnheader "Assignee" [ref=e160]
                - columnheader "Priority" [ref=e161]
                - columnheader "Due Date" [ref=e162]
                - columnheader "Status" [ref=e163]
            - rowgroup [ref=e164]:
              - row "#FE5733D2 FSM Forward 1784136715162 ROUTINE T Test Encoder1 → Medium 2d left To do" [ref=e165] [cursor=pointer]:
                - cell [ref=e166]:
                  - checkbox [ref=e167]
                - cell "#FE5733D2" [ref=e168]
                - cell "FSM Forward 1784136715162 ROUTINE" [ref=e169]:
                  - generic [ref=e170]:
                    - generic [ref=e171]: FSM Forward 1784136715162
                    - generic [ref=e172]: ROUTINE
                - cell "T Test Encoder1" [ref=e173]:
                  - generic [ref=e174]:
                    - generic "Test Encoder1" [ref=e175]: T
                    - generic [ref=e176]: Test Encoder1
                - cell "→ Medium" [ref=e177]:
                  - generic [ref=e178]:
                    - generic [ref=e179]: →
                    - text: Medium
                - cell "2d left" [ref=e180]:
                  - generic [ref=e182]: 2d left
                - cell "To do" [ref=e183]:
                  - generic [ref=e185]: To do
              - row "#4A73A527 E2E Recs&Comments 1784136590925 ROUTINE T Test Encoder1 → Medium 2d left To do" [ref=e188] [cursor=pointer]:
                - cell [ref=e189]:
                  - checkbox [ref=e190]
                - cell "#4A73A527" [ref=e191]
                - cell "E2E Recs&Comments 1784136590925 ROUTINE" [ref=e192]:
                  - generic [ref=e193]:
                    - generic [ref=e194]: E2E Recs&Comments 1784136590925
                    - generic [ref=e195]: ROUTINE
                - cell "T Test Encoder1" [ref=e196]:
                  - generic [ref=e197]:
                    - generic "Test Encoder1" [ref=e198]: T
                    - generic [ref=e199]: Test Encoder1
                - cell "→ Medium" [ref=e200]:
                  - generic [ref=e201]:
                    - generic [ref=e202]: →
                    - text: Medium
                - cell "2d left" [ref=e203]:
                  - generic [ref=e205]: 2d left
                - cell "To do" [ref=e206]:
                  - generic [ref=e208]: To do
              - row "#8A668018 E2E Test Task 1784136568607 ROUTINE T Test Encoder1 ⬆ Urgent 1d left To do" [ref=e211] [cursor=pointer]:
                - cell [ref=e212]:
                  - checkbox [ref=e213]
                - cell "#8A668018" [ref=e214]
                - cell "E2E Test Task 1784136568607 ROUTINE" [ref=e215]:
                  - generic [ref=e216]:
                    - generic [ref=e217]: E2E Test Task 1784136568607
                    - generic [ref=e218]: ROUTINE
                - cell "T Test Encoder1" [ref=e219]:
                  - generic [ref=e220]:
                    - generic "Test Encoder1" [ref=e221]: T
                    - generic [ref=e222]: Test Encoder1
                - cell "⬆ Urgent" [ref=e223]:
                  - generic [ref=e224]:
                    - generic [ref=e225]: ⬆
                    - text: Urgent
                - cell "1d left" [ref=e226]:
                  - generic [ref=e228]: 1d left
                - cell "To do" [ref=e229]:
                  - generic [ref=e231]: To do
              - row "#F9E53DA6 E2E Test Task 1784136524908 ROUTINE T Test Encoder1 ⬆ Urgent 1d left To do" [ref=e234] [cursor=pointer]:
                - cell [ref=e235]:
                  - checkbox [ref=e236]
                - cell "#F9E53DA6" [ref=e237]
                - cell "E2E Test Task 1784136524908 ROUTINE" [ref=e238]:
                  - generic [ref=e239]:
                    - generic [ref=e240]: E2E Test Task 1784136524908
                    - generic [ref=e241]: ROUTINE
                - cell "T Test Encoder1" [ref=e242]:
                  - generic [ref=e243]:
                    - generic "Test Encoder1" [ref=e244]: T
                    - generic [ref=e245]: Test Encoder1
                - cell "⬆ Urgent" [ref=e246]:
                  - generic [ref=e247]:
                    - generic [ref=e248]: ⬆
                    - text: Urgent
                - cell "1d left" [ref=e249]:
                  - generic [ref=e251]: 1d left
                - cell "To do" [ref=e252]:
                  - generic [ref=e254]: To do
              - row "#C0E16DFC FSM Cancel 1784133863246 ROUTINE T Test Encoder1 → Medium 2d left To do" [ref=e257] [cursor=pointer]:
                - cell [ref=e258]:
                  - checkbox [ref=e259]
                - cell "#C0E16DFC" [ref=e260]
                - cell "FSM Cancel 1784133863246 ROUTINE" [ref=e261]:
                  - generic [ref=e262]:
                    - generic [ref=e263]: FSM Cancel 1784133863246
                    - generic [ref=e264]: ROUTINE
                - cell "T Test Encoder1" [ref=e265]:
                  - generic [ref=e266]:
                    - generic "Test Encoder1" [ref=e267]: T
                    - generic [ref=e268]: Test Encoder1
                - cell "→ Medium" [ref=e269]:
                  - generic [ref=e270]:
                    - generic [ref=e271]: →
                    - text: Medium
                - cell "2d left" [ref=e272]:
                  - generic [ref=e274]: 2d left
                - cell "To do" [ref=e275]:
                  - generic [ref=e277]: To do
              - row "#87DBCE8C FSM Hold 1784133801125 ROUTINE T Test Encoder1 ↘ Low 2d left To do" [ref=e280] [cursor=pointer]:
                - cell [ref=e281]:
                  - checkbox [ref=e282]
                - cell "#87DBCE8C" [ref=e283]
                - cell "FSM Hold 1784133801125 ROUTINE" [ref=e284]:
                  - generic [ref=e285]:
                    - generic [ref=e286]: FSM Hold 1784133801125
                    - generic [ref=e287]: ROUTINE
                - cell "T Test Encoder1" [ref=e288]:
                  - generic [ref=e289]:
                    - generic "Test Encoder1" [ref=e290]: T
                    - generic [ref=e291]: Test Encoder1
                - cell "↘ Low" [ref=e292]:
                  - generic [ref=e293]:
                    - generic [ref=e294]: ↘
                    - text: Low
                - cell "2d left" [ref=e295]:
                  - generic [ref=e297]: 2d left
                - cell "To do" [ref=e298]:
                  - generic [ref=e300]: To do
              - row "#AF23AF5F FSM Forward 1784133782460 ROUTINE T Test Encoder1 → Medium 2d left To do" [ref=e303] [cursor=pointer]:
                - cell [ref=e304]:
                  - checkbox [ref=e305]
                - cell "#AF23AF5F" [ref=e306]
                - cell "FSM Forward 1784133782460 ROUTINE" [ref=e307]:
                  - generic [ref=e308]:
                    - generic [ref=e309]: FSM Forward 1784133782460
                    - generic [ref=e310]: ROUTINE
                - cell "T Test Encoder1" [ref=e311]:
                  - generic [ref=e312]:
                    - generic "Test Encoder1" [ref=e313]: T
                    - generic [ref=e314]: Test Encoder1
                - cell "→ Medium" [ref=e315]:
                  - generic [ref=e316]:
                    - generic [ref=e317]: →
                    - text: Medium
                - cell "2d left" [ref=e318]:
                  - generic [ref=e320]: 2d left
                - cell "To do" [ref=e321]:
                  - generic [ref=e323]: To do
              - row "#EB854FCB E2E Recs&Comments 1784133657290 ROUTINE T Test Encoder1 → Medium 2d left To do" [ref=e326] [cursor=pointer]:
                - cell [ref=e327]:
                  - checkbox [ref=e328]
                - cell "#EB854FCB" [ref=e329]
                - cell "E2E Recs&Comments 1784133657290 ROUTINE" [ref=e330]:
                  - generic [ref=e331]:
                    - generic [ref=e332]: E2E Recs&Comments 1784133657290
                    - generic [ref=e333]: ROUTINE
                - cell "T Test Encoder1" [ref=e334]:
                  - generic [ref=e335]:
                    - generic "Test Encoder1" [ref=e336]: T
                    - generic [ref=e337]: Test Encoder1
                - cell "→ Medium" [ref=e338]:
                  - generic [ref=e339]:
                    - generic [ref=e340]: →
                    - text: Medium
                - cell "2d left" [ref=e341]:
                  - generic [ref=e343]: 2d left
                - cell "To do" [ref=e344]:
                  - generic [ref=e346]: To do
          - generic [ref=e349]:
            - generic [ref=e350]: Page 1 of 2
            - generic [ref=e351]:
              - button [disabled] [ref=e352]:
                - img [ref=e353]
              - button "1" [ref=e355] [cursor=pointer]
              - button "2" [ref=e356] [cursor=pointer]
              - button [ref=e357] [cursor=pointer]:
                - img [ref=e358]
    - generic [ref=e361]:
      - generic [ref=e362]:
        - generic [ref=e363]:
          - heading "Create New Task" [level=3] [ref=e364]
          - paragraph [ref=e365]: Fill in the details to create a new task.
        - button [ref=e366] [cursor=pointer]:
          - img [ref=e367]
      - generic [ref=e370]:
        - generic [ref=e371]:
          - generic [ref=e372]: Task Title *
          - textbox "e.g. Route planning update" [ref=e373]: E2E Test Task 1784137047159
          - generic [ref=e374]:
            - generic [ref=e375]: ✓ Looks good
            - generic [ref=e376]: 27/150
        - generic [ref=e377]:
          - generic [ref=e378]: Description *
          - textbox "Describe the task..." [ref=e379]: Automated test for task creation and SLA enforcement
          - generic [ref=e381]: 52/2000
        - generic [ref=e382]:
          - generic [ref=e383]:
            - generic [ref=e384]: Due Date *
            - textbox [ref=e385]: 2026-07-16T17:37
            - generic [ref=e386]:
              - img [ref=e387]
              - text: SLA enforced — deadline locked to 24 hours from creation
          - generic [ref=e390]:
            - generic [ref=e391]: Priority *
            - combobox [ref=e392]:
              - option "Select priority"
              - option "🔴 Urgent" [selected]
              - option "🟠 High"
              - option "🟡 Medium"
              - option "🟢 Low"
            - generic [ref=e393]: 🔴 Urgent — requires immediate attention
        - generic [ref=e394]:
          - generic [ref=e395]: Classification *
          - generic [ref=e396]:
            - generic [ref=e397] [cursor=pointer]: Routine Daily Task
            - generic [ref=e398] [cursor=pointer]: Special Task
        - generic [ref=e399]:
          - generic [ref=e400]: Task Category (optional)
          - combobox [ref=e401]:
            - option "Select category" [selected]
            - option "Operations"
            - option "Logistics"
            - option "IT & Admin"
            - option "Customer Service"
            - option "Maintenance"
            - option "Other"
        - generic [ref=e402]:
          - generic [ref=e403]: Supporting Document (optional)
          - button "Choose File" [ref=e405]
        - generic [ref=e406] [cursor=pointer]:
          - checkbox "Confidential Task Restrict visibility to Coordinators and Manager only" [ref=e407]
          - generic [ref=e408]:
            - generic [ref=e409]:
              - img [ref=e411]
              - generic [ref=e414]: Confidential Task
            - generic [ref=e415]: Restrict visibility to Coordinators and Manager only
        - generic [ref=e416]:
          - generic [ref=e419]: Assignment
          - generic [ref=e420]:
            - generic [ref=e421] [cursor=pointer]:
              - img [ref=e422]
              - text: Single
            - generic [ref=e426] [cursor=pointer]:
              - img [ref=e427]
              - text: Team
            - generic [ref=e432] [cursor=pointer]:
              - img [ref=e433]
              - text: Department
          - generic [ref=e436]:
            - img [ref=e437]
            - generic [ref=e439]:
              - text: "Recommended:"
              - strong [ref=e440]: Test Courier1
              - text: — Available for assignment
          - generic [ref=e441]:
            - generic [ref=e442]: Available Employees
            - generic [ref=e443]:
              - generic [ref=e444] [cursor=pointer]:
                - generic [ref=e445]: Test Courier1
                - generic [ref=e446]: Active
                - generic [ref=e447]: 0 tasks
                - generic [ref=e448]: Best pick
              - generic [ref=e449] [cursor=pointer]:
                - generic [ref=e450]: Test Courier2
                - generic [ref=e451]: Active
                - generic [ref=e452]: 0 tasks
              - generic [ref=e453] [cursor=pointer]:
                - generic [ref=e454]: Test Dispatcher1
                - generic [ref=e455]: Active
                - generic [ref=e456]: 0 tasks
              - generic [ref=e457] [cursor=pointer]:
                - generic [ref=e458]: Test Dispatcher2
                - generic [ref=e459]: Active
                - generic [ref=e460]: 0 tasks
              - generic [ref=e461] [cursor=pointer]:
                - generic [ref=e462]:
                  - img [ref=e463]
                  - text: Test Encoder1
                - generic [ref=e466]: Active
                - generic [ref=e467]: 0 tasks
              - generic [ref=e468] [cursor=pointer]:
                - generic [ref=e469]: Test Encoder2
                - generic [ref=e470]: Active
                - generic [ref=e471]: 0 tasks
          - generic [ref=e472]:
            - img [ref=e473]
            - text: Test Encoder1 assigned
      - generic [ref=e477]:
        - button "Cancel" [ref=e478] [cursor=pointer]
        - button "Save Changes" [ref=e479] [cursor=pointer]:
          - img [ref=e480]
          - text: Save Changes
    - dialog [ref=e485]:
      - generic [ref=e486]:
        - generic [ref=e487]:
          - heading "Potential duplicate task detected." [level=3] [ref=e488]
          - paragraph [ref=e489]: The system found 3 similar tasks in existing records. Review the matches below.
        - button [ref=e490] [cursor=pointer]:
          - img [ref=e491]
      - generic [ref=e494]:
        - table [ref=e497]:
          - rowgroup [ref=e498]:
            - row "Existing Task Title Task ID Status Similarity" [ref=e499]:
              - columnheader "Existing Task Title" [ref=e500]
              - columnheader "Task ID" [ref=e501]
              - columnheader "Status" [ref=e502]
              - columnheader "Similarity" [ref=e503]
          - rowgroup [ref=e504]:
            - row "E2E Test Task 1784132765304 188ed23a... NotStarted 76%" [ref=e505]:
              - cell "E2E Test Task 1784132765304" [ref=e506]
              - cell "188ed23a..." [ref=e507]
              - cell "NotStarted" [ref=e508]:
                - generic [ref=e509]: NotStarted
              - cell "76%" [ref=e510]
            - row "E2E Test Task 1784136524908 f9e53da6... NotStarted 76%" [ref=e511]:
              - cell "E2E Test Task 1784136524908" [ref=e512]
              - cell "f9e53da6..." [ref=e513]
              - cell "NotStarted" [ref=e514]:
                - generic [ref=e515]: NotStarted
              - cell "76%" [ref=e516]
            - row "E2E Test Task 1784136568607 8a668018... NotStarted 76%" [ref=e517]:
              - cell "E2E Test Task 1784136568607" [ref=e518]
              - cell "8a668018..." [ref=e519]
              - cell "NotStarted" [ref=e520]:
                - generic [ref=e521]: NotStarted
              - cell "76%" [ref=e522]
        - generic [ref=e524]:
          - button "Cancel" [ref=e525] [cursor=pointer]:
            - img [ref=e526]
            - text: Cancel
          - button "Continue Anyway" [ref=e529] [cursor=pointer]:
            - img [ref=e530]
            - text: Continue Anyway
  - generic [ref=e533]: "0"
```

# Test source

```ts
  1   | import { Page, expect } from '@playwright/test';
  2   | 
  3   | export const NEW_PW = 'E2eTest@2024!StrongPass';
  4   | 
  5   | async function doLogin(page: Page, employeeId: string, password: string) {
  6   |   await page.goto('/');
  7   |   await page.locator('#employeeId').fill(employeeId);
  8   |   await page.locator('#password').fill(password);
  9   |   await page.locator('button.submit-btn').click();
  10  |   await page.waitForTimeout(2_000);
  11  | }
  12  | 
  13  | async function finalizePasswordChange(page: Page, employeeId: string, originalPassword: string) {
  14  |   const token = await page.evaluate(() => localStorage.getItem('authToken'));
  15  |   if (!token) return false;
  16  | 
  17  |   const resp = await page.request.post('/api/Auth/change-password', {
  18  |     headers: { Authorization: `Bearer ${token}` },
  19  |     data: { currentPassword: originalPassword, newPassword: NEW_PW, confirmPassword: NEW_PW },
  20  |   });
  21  |   const body = await resp.json() as any;
  22  |   if (!body.isSuccess) return false;
  23  | 
  24  |   await page.evaluate(() => localStorage.setItem('isPasswordChanged', 'true'));
  25  |   await doLogin(page, employeeId, NEW_PW);
  26  |   return true;
  27  | }
  28  | 
  29  | export async function loginAndHandleOnboarding(page: Page, employeeId: string, originalPassword: string, role: string) {
  30  |   await doLogin(page, employeeId, originalPassword);
  31  | 
  32  |   const url = page.url();
  33  | 
  34  |   // Case 1: Already on dashboard
  35  |   if (url.includes('/SystemAdmin') || url.includes('/OpAdmin') || url.includes('/OpEmployee')) {
  36  |     const path = getExpectedDashboard(role);
  37  |     await page.waitForURL(`**${path}`, { timeout: 15_000 });
  38  |     return;
  39  |   }
  40  | 
  41  |   // Case 2: Redirected to onboarding → change password via API
  42  |   if (url.includes('/onboarding') || url.includes('/set-password')) {
  43  |     const ok = await finalizePasswordChange(page, employeeId, originalPassword);
  44  |     if (ok) {
  45  |       const path = getExpectedDashboard(role);
  46  |       await page.waitForURL(`**${path}`, { timeout: 15_000 });
  47  |       return;
  48  |     }
  49  |   }
  50  | 
  51  |   // Case 3: Login failed (password already changed) → retry with new password
  52  |   await doLogin(page, employeeId, NEW_PW);
  53  |   const path = getExpectedDashboard(role);
  54  |   await page.waitForURL(`**${path}`, { timeout: 15_000 });
  55  | }
  56  | 
  57  | export function getExpectedDashboard(role: string): string {
  58  |   const map: Record<string, string> = {
  59  |     Manager: '/SystemAdmin_Dashboard',
  60  |     Coordinator: '/OpAdmin_Dashboard',
  61  |     Encoder: '/OpEmployee_Dashboard',
  62  |     Dispatcher: '/OpEmployee_Dashboard',
  63  |     Courier: '/OpEmployee_Dashboard',
  64  |     Accountant: '/OpEmployee_Dashboard',
  65  |   };
  66  |   return map[role] ?? '/OpEmployee_Dashboard';
  67  | }
  68  | 
  69  | export async function login(page: Page, employeeId: string, password: string) {
  70  |   await page.goto('/');
  71  |   await page.locator('#employeeId').fill(employeeId);
  72  |   await page.locator('#password').fill(password);
  73  |   await page.locator('button.submit-btn').click();
  74  |   await page.waitForTimeout(2_000);
  75  | }
  76  | 
  77  | export async function waitForDashboard(page: Page, role: string) {
  78  |   const path = getExpectedDashboard(role);
  79  |   await page.waitForURL(`**${path}`, { timeout: 15_000 });
  80  | }
  81  | 
  82  | export async function logout(page: Page, role: string) {
  83  |   const logoutBtn = page.locator('button.profile-logout[aria-label="Logout"]');
> 84  |   await logoutBtn.click();
      |                   ^ Error: locator.click: Test timeout of 60000ms exceeded.
  85  | 
  86  |   if (role === 'Manager') {
  87  |     await page.locator('.cm-btn.cm-btn-confirm', { hasText: 'Log out' }).click();
  88  |   }
  89  |   await page.waitForURL('**/', { timeout: 10_000 });
  90  | }
  91  | 
  92  | export async function waitForSuccessToast(page: Page) {
  93  |   const toast = page.locator('.toast.toast-success');
  94  |   await expect(toast).toBeVisible({ timeout: 10_000 });
  95  | }
  96  | 
  97  | export async function openSidebarTab(page: Page, label: string) {
  98  |   await page.evaluate(() => {
  99  |     const sidebar = document.querySelector('.sidebar');
  100 |     if (sidebar) sidebar.scrollTop = sidebar.scrollHeight;
  101 |   });
  102 |   await page.waitForTimeout(500);
  103 |   const item = page.locator('.nav-item-label', { hasText: label });
  104 |   await item.click({ force: true });
  105 | }
  106 | 
  107 | export async function openEmployeeDetail(page: Page, employeeId: string) {
  108 |   const row = page.locator('table tbody tr', { hasText: employeeId });
  109 |   await row.click();
  110 | }
  111 | 
  112 | export async function confirmPasswordGate(page: Page, password: string, confirmLabel: string) {
  113 |   await page.locator('#gate-pw-input').fill(password);
  114 |   await page.locator('.cm-btn.cm-btn-confirm', { hasText: confirmLabel }).click();
  115 | }
  116 | 
```