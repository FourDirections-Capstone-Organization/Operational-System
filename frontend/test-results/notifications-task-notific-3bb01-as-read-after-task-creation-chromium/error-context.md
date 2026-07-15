# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications\task-notifications.spec.ts >> Flow 3.1: Task Notifications >> notification bell triggers and marks as read after task creation
- Location: playwright\tests\notifications\task-notifications.spec.ts:26:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('.sr-eligible-row').filter({ hasText: 'ENC001' }).first()

```

# Page snapshot

```yaml
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
          - generic [ref=e77]: Wednesday, July 15, 2026
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
          - heading "0" [level=3] [ref=e97]
          - generic [ref=e98]: 0 tasks
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
        - generic [ref=e117]:
          - generic [ref=e118]:
            - img [ref=e120]
            - generic [ref=e123]: Overdue
          - heading "0" [level=3] [ref=e124]
          - generic [ref=e125]: No overdue tasks
      - generic [ref=e126]:
        - generic [ref=e127]:
          - button "Active" [ref=e128] [cursor=pointer]:
            - generic [ref=e130]: Active
          - button "Completed" [ref=e131] [cursor=pointer]:
            - generic [ref=e133]: Completed
          - button "Bin" [ref=e134] [cursor=pointer]:
            - generic [ref=e136]: Bin
        - heading "Task Manager" [level=3] [ref=e138]
        - generic [ref=e139]:
          - generic [ref=e141]: 0 results on this page
          - generic [ref=e142]:
            - generic [ref=e143]:
              - img
              - textbox "Search by task, assignee, project…" [ref=e144]
            - combobox [ref=e145] [cursor=pointer]:
              - option "All Priorities" [selected]
              - option "Critical"
              - option "High"
              - option "Medium"
              - option "Low"
            - combobox [ref=e146] [cursor=pointer]:
              - option "All Classifications" [selected]
              - option "Routine Daily"
              - option "Special Task"
            - combobox [ref=e147] [cursor=pointer]:
              - option "All Assignees" [selected]
            - button "New Task" [ref=e148] [cursor=pointer]:
              - img [ref=e149]
              - generic [ref=e150]: New Task
        - table [ref=e152]:
          - rowgroup [ref=e153]:
            - row "# Task Assignee Priority Due Date Status" [ref=e154]:
              - columnheader [ref=e155]
              - columnheader "#" [ref=e156]
              - columnheader "Task" [ref=e157]
              - columnheader "Assignee" [ref=e158]
              - columnheader "Priority" [ref=e159]
              - columnheader "Due Date" [ref=e160]
              - columnheader "Status" [ref=e161]
          - rowgroup [ref=e162]:
            - row "No tasks found." [ref=e163]:
              - cell "No tasks found." [ref=e164]:
                - generic [ref=e165]:
                  - img [ref=e166]
                  - paragraph [ref=e170]: No tasks found.
        - generic [ref=e171]:
          - generic [ref=e172]: Page 1 of 0
          - generic [ref=e173]:
            - button [disabled] [ref=e174]:
              - img [ref=e175]
            - button [ref=e177] [cursor=pointer]:
              - img [ref=e178]
  - generic [ref=e181]:
    - generic [ref=e182]:
      - generic [ref=e183]:
        - heading "Create New Task" [level=3] [ref=e184]
        - paragraph [ref=e185]: Fill in the details to create a new task.
      - button [ref=e186] [cursor=pointer]:
        - img [ref=e187]
    - generic [ref=e190]:
      - generic [ref=e191]:
        - generic [ref=e192]: Task Title *
        - textbox "e.g. Route planning update" [ref=e193]: Notif Test Task 1784124918504
        - generic [ref=e194]:
          - generic [ref=e195]: ✓ Looks good
          - generic [ref=e196]: 29/150
      - generic [ref=e197]:
        - generic [ref=e198]: Description *
        - textbox "Describe the task..." [ref=e199]: Notification E2E test task
        - generic [ref=e201]: 26/2000
      - generic [ref=e202]:
        - generic [ref=e203]:
          - generic [ref=e204]: Due Date *
          - textbox [ref=e205]
          - generic [ref=e206]: Cannot be in the past.
        - generic [ref=e207]:
          - generic [ref=e208]: Priority *
          - combobox [ref=e209]:
            - option "Select priority"
            - option "🔴 Critical"
            - option "🟠 High"
            - option "🟡 Medium" [selected]
            - option "🟢 Low"
          - generic [ref=e210]: 🟡 Medium priority selected
      - generic [ref=e211]:
        - generic [ref=e212]: Classification *
        - generic [ref=e213]:
          - generic [ref=e214] [cursor=pointer]: Routine Daily Task
          - generic [ref=e215] [cursor=pointer]: Special Task
      - generic [ref=e216]:
        - generic [ref=e217]: Task Category (optional)
        - combobox [ref=e218]:
          - option "Select category" [selected]
          - option "Operations"
          - option "Logistics"
          - option "IT & Admin"
          - option "Customer Service"
          - option "Maintenance"
          - option "Other"
      - generic [ref=e219]:
        - generic [ref=e220]: Supporting Document (optional)
        - button "Choose File" [ref=e222]
      - generic [ref=e223] [cursor=pointer]:
        - checkbox "Confidential Task Restrict visibility to Coordinators and Manager only" [ref=e224]
        - generic [ref=e225]:
          - generic [ref=e226]:
            - img [ref=e228]
            - generic [ref=e231]: Confidential Task
          - generic [ref=e232]: Restrict visibility to Coordinators and Manager only
      - generic [ref=e233]:
        - generic [ref=e236]: Assignment
        - generic [ref=e237]:
          - generic [ref=e238] [cursor=pointer]:
            - img [ref=e239]
            - text: Single
          - generic [ref=e243] [cursor=pointer]:
            - img [ref=e244]
            - text: Team
          - generic [ref=e249] [cursor=pointer]:
            - img [ref=e250]
            - text: Department
        - generic [ref=e253]:
          - img [ref=e254]
          - generic [ref=e256]:
            - text: "Recommended:"
            - strong [ref=e257]: Test Courier1
            - text: — Available for assignment
        - generic [ref=e258]:
          - generic [ref=e259]: Available Employees
          - generic [ref=e260]:
            - generic [ref=e261] [cursor=pointer]:
              - generic [ref=e262]: Test Courier1
              - generic [ref=e263]: Active
              - generic [ref=e264]: 0 tasks
              - generic [ref=e265]: Best pick
            - generic [ref=e266] [cursor=pointer]:
              - generic [ref=e267]: Test Courier2
              - generic [ref=e268]: Active
              - generic [ref=e269]: 0 tasks
            - generic [ref=e270] [cursor=pointer]:
              - generic [ref=e271]: Test Dispatcher1
              - generic [ref=e272]: Active
              - generic [ref=e273]: 0 tasks
            - generic [ref=e274] [cursor=pointer]:
              - generic [ref=e275]: Test Dispatcher2
              - generic [ref=e276]: Active
              - generic [ref=e277]: 0 tasks
            - generic [ref=e278] [cursor=pointer]:
              - generic [ref=e279]: Test Encoder1
              - generic [ref=e280]: Active
              - generic [ref=e281]: 0 tasks
            - generic [ref=e282] [cursor=pointer]:
              - generic [ref=e283]: Test Encoder2
              - generic [ref=e284]: Active
              - generic [ref=e285]: 0 tasks
    - generic [ref=e287]:
      - button "Cancel" [ref=e288] [cursor=pointer]
      - button "Save Changes" [ref=e289] [cursor=pointer]:
        - img [ref=e290]
        - text: Save Changes
```

# Test source

```ts
  1  | import { Page, expect } from '@playwright/test';
  2  | 
  3  | export interface TaskFormData {
  4  |   title: string;
  5  |   description: string;
  6  |   priority?: string;
  7  |   classification?: string;
  8  |   assigneeName?: string;
  9  |   isConfidential?: boolean;
  10 | }
  11 | 
  12 | export async function clickNewTask(page: Page) {
  13 |   await page.locator('button.btn.btn-primary', { has: page.locator('span', { hasText: 'New Task' }) }).click();
  14 |   await page.locator('.modal-card h3', { hasText: /Create New Task/ }).waitFor({ state: 'visible', timeout: 5_000 });
  15 | }
  16 | 
  17 | export async function fillTaskTitle(page: Page, title: string) {
  18 |   const input = page.locator('input[placeholder="e.g. Route planning update"]');
  19 |   await input.fill(title);
  20 | }
  21 | 
  22 | export async function fillTaskDescription(page: Page, description: string) {
  23 |   const textarea = page.locator('textarea[placeholder="Describe the task..."]');
  24 |   await textarea.fill(description);
  25 | }
  26 | 
  27 | export async function selectPriority(page: Page, priority: string) {
  28 |   const select = page.locator('.modal-card .field-row .field select').last();
  29 |   await select.selectOption(priority);
  30 | }
  31 | 
  32 | export async function selectClassification(page: Page, label: string) {
  33 |   await page.locator('label', { hasText: label }).click();
  34 | }
  35 | 
  36 | export async function selectSingleAssignee(page: Page, name: string) {
> 37 |   await page.locator('.sr-eligible-row', { hasText: name }).first().click();
     |                                                                     ^ Error: locator.click: Test timeout of 60000ms exceeded.
  38 | }
  39 | 
  40 | export async function submitTaskForm(page: Page) {
  41 |   await page.locator('.modal-actions button.btn.btn-primary', { hasText: 'Save Changes' }).click();
  42 | }
  43 | 
  44 | export async function verifyTaskInTable(page: Page, title: string) {
  45 |   const row = page.locator('table tbody tr', { hasText: title });
  46 |   await expect(row).toBeVisible({ timeout: 10_000 });
  47 | }
  48 | 
  49 | export async function verifyTaskCard(page: Page, title: string) {
  50 |   const card = page.locator('.task-card', { has: page.locator('.tc-name', { hasText: title }) });
  51 |   await expect(card).toBeVisible({ timeout: 10_000 });
  52 | }
  53 | 
```