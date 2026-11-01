import { test, expect } from '@playwright/test';

test('new engagement → private interview → verification → reviews → downloaded Markdown', async ({ page, request }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'New engagement', exact: true }).first().click();
  await page.getByLabel('Engagement name').fill('Browser-tested onboarding');
  await page.getByLabel('What problem or opportunity are we exploring?').fill('Manual onboarding creates avoidable handoffs and unclear ownership for the operations team.');
  await page.getByLabel('Business owner').fill('Alex Morgan');
  await page.getByLabel('In scope', { exact: false }).fill('Request intake and approval routing.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Full name').fill('Jordan Taylor');
  await page.getByLabel('Role', { exact: false }).fill('Operations lead');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText('Nothing is handed off until everyone is heard.')).toBeVisible();
  await page.getByRole('button', { name: 'Create & schedule interviews' }).click();
  await expect(page.getByRole('heading', { name: 'Browser-tested onboarding', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Stakeholders', exact: true }).click();
  const href = await page.getByRole('link', { name: 'Open private interview' }).getAttribute('href');
  const token = href.split('/interview/')[1];
  const interview = await page.context().newPage(); await interview.goto(href);
  await expect(interview.getByRole('heading', { name: 'What is driving this change, and why does it matter now?' })).toBeVisible();
  // The stakeholder is asked how much time they have, then the interview is paced to that budget.
  await expect(interview.getByRole('heading', { name: 'How much time do you have for this interview?' })).toBeVisible();
  await interview.getByRole('button', { name: '30 min', exact: true }).click();
  await expect(interview.getByText('You allowed 30 minutes', { exact: false }).first()).toBeVisible();
  await interview.getByLabel('Your perspective', { exact: true }).fill('The operations owner needs a clear intake workflow because requests are currently handed between three teams.');
  await interview.getByRole('button', { name: 'Save & continue', exact: true }).click();
  await expect(interview.getByRole('heading', { name: 'Walk me through how this work happens today, from start to finish.' })).toBeVisible();
  // The expanded, detailed version of the answer is shown and can be refined.
  await expect(interview.getByText('Your answer, expanded')).toBeVisible();
  await interview.getByRole('button', { name: 'Refine wording' }).click();
  await interview.getByLabel('Refine the detailed version of your answer').fill('Requests need one intake with a named owner, because three teams currently hand the same request between them and the customer cannot see its status.');
  await interview.getByRole('button', { name: 'Save detailed version' }).click();
  await expect(interview.getByText('Your refined wording', { exact: false })).toBeVisible();
  // The arrow on a suggested answer submits it immediately.
  await interview.locator('.suggestion-submit').first().click();
  await expect(interview.getByRole('heading', { name: 'Which business priority should this support, and who owns that priority?' })).toBeVisible();
  await interview.getByRole('button', { name: 'Save & pause' }).click();
  await expect(interview.getByRole('heading', { name: 'A pause, not a reset.' })).toBeVisible();
  await interview.reload();
  // A paused interview stays paused: reminders are suspended until the stakeholder continues.
  await expect(interview.getByRole('heading', { name: 'A pause, not a reset.' })).toBeVisible();
  await interview.getByRole('button', { name: 'Continue the conversation' }).click();
  await expect(interview.getByRole('heading', { name: 'Which business priority should this support, and who owns that priority?' })).toBeVisible();
  // Use the same public API for the remaining repetitive answers; all completion and review actions stay in the UI.
  let view = (await (await request.get(`/api/interviews/${token}`)).json());
  for (let i = 0; i < 60 && view.person.status !== 'completed'; i++) {
    const next = await (await request.post(`/api/interviews/${token}/next`, { data: { continueEarly: true } })).json();
    if (next.completionReady) break;
    const response = await request.post(`/api/interviews/${token}/answer`, { data: { questionId: next.question.id, text: 'The accountable operations owner will validate a baseline of 40 minutes and a target of 25 minutes using recent records.', disposition: 'answered', priority: 'Should have', expectedVersion: next.engagement.revision } });
    expect(response.ok()).toBeTruthy();
  }
  await interview.reload();
  await expect(interview.getByRole('heading', { name: 'Here’s the picture you’ve helped create.' })).toBeVisible();
  await interview.getByRole('checkbox').check();
  await interview.getByRole('button', { name: 'Confirm & complete my interview' }).click();
  await expect(interview.getByRole('heading', { name: 'Thank you, Jordan.' })).toBeVisible();
  const verificationForms = interview.locator('.verification-card form');
  const count = await verificationForms.count(); expect(count).toBeGreaterThanOrEqual(2);
  for (let i = 0; i < count; i++) { const form = interview.locator('.verification-card form').first(); await form.getByRole('textbox').fill('Verified with the accountable owner. Independent specialist review remains required for this single-source engagement.'); await form.getByRole('button', { name: 'Send verification' }).click(); await expect(interview.locator('.verification-card form')).toHaveCount(count - i - 1); }
  await page.reload(); await page.getByRole('tab', { name: /Verification/ }).click();
  for (let i = 0; i < count; i++) { const form = page.locator('.resolution-form').first(); await form.getByRole('textbox').fill('BA confirms the recorded position and explicitly retains the independent-review limitation.'); await form.getByRole('button', { name: 'Record resolution' }).click(); await expect(page.locator('.resolution-form')).toHaveCount(count - i - 1); }
  // Change management is optional and off by default; enable it for this engagement.
  await page.getByRole('tab', { name: 'Change (optional)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'People and change are optional here.' })).toBeVisible();
  await page.getByRole('button', { name: 'Enable change management' }).click();
  await expect(page.getByRole('heading', { name: 'Make the change work for people.' })).toBeVisible();
  await page.getByRole('button', { name: 'Use starter plan' }).click();
  await page.getByRole('button', { name: 'Save change plan' }).click();
  await expect(page.getByText('Your change plan is saved.', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'Review & handoff' }).click();
  for (const area of ['Business & requirements', 'Technical reservations', 'Cyber & privacy', 'People & adoption']) {
    const card = page.locator('.review-card').filter({ has: page.getByRole('heading', { name: area, exact: true }) });
    await card.getByLabel('Reviewer name').fill('Alex Morgan');
    await card.getByLabel('Reviewer role').fill(`${area} reviewer`);
    await card.getByLabel('Evidence reviewed, decisions, and reservations').fill('Reviewed the original evidence and resolutions. Proposed controls and acceptance tests remain to be implemented and verified.');
    await card.getByRole('button', { name: 'Record approval' }).click();
    await expect(card.getByText('Approved', { exact: true })).toBeVisible();
  }
  await page.getByRole('checkbox', { name: /I confirm that the reviews/ }).check();
  await page.getByRole('button', { name: 'Generate Markdown handoff' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.markdown-preview')).toContainText('Cyber threat precautions');
  await expect(page.locator('.markdown-preview')).toContainText('Single-source limitation');
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download .md', exact: true }).click(); const download = await downloadPromise; expect(download.suggestedFilename()).toMatch(/ENG-.*requirements-v\d+\.md/);
  expect(errors).toEqual([]);
});

test('catalog registration and existing-change setup work; mobile navigation has no horizontal overflow', async ({ page }) => {
  await page.goto('/#/catalog');
  await page.getByRole('button', { name: 'Add solution', exact: true }).click();
  await page.getByLabel('Solution name').fill('Service desk portal');
  await page.getByLabel('Category', { exact: false }).fill('Customer operations');
  await page.getByLabel('Record owner').fill('Service desk owner');
  await page.getByLabel('What the solution does').fill('A deployed portal for service requests and case status.');
  await page.getByLabel('Source document path').fill('docs/service-desk.md');
  await page.getByRole('button', { name: 'Add to registry' }).click();
  const card = page.locator('.catalog-card').filter({ has: page.getByRole('heading', { name: 'Service desk portal' }) });
  await expect(card).toBeVisible(); await card.getByRole('button', { name: 'Plan a change' }).click();
  await expect(page.getByLabel('Repository solution')).toHaveValue('service-desk-portal');
  await page.getByLabel('As-is baseline').fill('The deployed portal supports manual case assignment.');
  await page.getByLabel('Requested change').fill('Add rule-based assignment with an auditable override.');
  await page.getByLabel('Engagement name').fill('Service desk assignment change');
  await page.getByLabel('What problem or opportunity are we exploring?').fill('Manual assignment creates inconsistent ownership and delays for service requests.');
  await page.getByLabel('Business owner').fill('Service desk owner');
  await page.getByLabel('In scope', { exact: false }).fill('Assignment rules and override audit.');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Full name').fill('Casey Lee'); await page.getByLabel('Role', { exact: false }).fill('Service desk manager');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create & schedule interviews' }).click();
  await expect(page.getByRole('heading', { name: 'From current state to meaningful change' })).toBeVisible();
  await expect(page.getByText('Add rule-based assignment with an auditable override.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your discovery workspace.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('what’s new, live progress, and inviting a stakeholder mid-engagement', async ({ page, request }) => {
  const availability = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, start: '08:00', end: '18:00' }));
  const created = await request.post('/api/engagements', { data: { title: 'Parallel interview check', problem: 'Two stakeholders need to share their perspective at the same time without waiting for a free BA slot.', owner: 'Alex Morgan', type: 'new', scopeIn: 'Interview progress and reminders.', startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), sessionMinutes: 30, stakeholders: [{ name: 'Jordan Taylor', role: 'Operations lead', function: 'Business', email: '', timezone: 'Australia/Sydney', availability }] } });
  expect(created.ok()).toBeTruthy(); const engagement = (await created.json()).engagement;

  await page.goto(`/#/engagement/${engagement.id}`);
  await page.getByRole('tab', { name: /Live progress/ }).click();
  await expect(page.getByRole('heading', { name: 'Who is where, right now.' })).toBeVisible();
  await expect(page.locator('.progress-person')).toHaveCount(1);
  await expect(page.getByText('No time budget given yet')).toBeVisible();
  await page.getByRole('button', { name: 'Send reminder' }).click();
  await expect(page.getByText('Reminder sent to Jordan Taylor', { exact: false })).toBeVisible();

  await page.getByRole('tab', { name: 'Stakeholders', exact: true }).click();
  await page.getByRole('button', { name: 'Invite stakeholder' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Full name').fill('Priya Shah');
  await dialog.getByLabel('Role', { exact: false }).fill('Security partner');
  await dialog.getByLabel('Function').selectOption('Security');
  await dialog.getByRole('button', { name: 'Invite stakeholder' }).click();
  await expect(dialog.getByText('Priya Shah is invited.', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).first().click();
  await expect(page.locator('.stakeholder-panel')).toHaveCount(2);
  await page.getByRole('tab', { name: /Live progress/ }).click();
  await expect(page.locator('.progress-person')).toHaveCount(2);

  await page.goto('/#/whats-new');
  await expect(page.getByRole('heading', { name: 'What's new.', exact: true })).toBeVisible();
  await expect(page.getByText('Nothing changes silently.')).toBeVisible();
  await page.getByRole('button', { name: 'Planned', exact: true }).click();
  await expect(page.getByText('Planned').first()).toBeVisible();
  await page.getByRole('button', { name: 'Past releases', exact: true }).click();
  await expect(page.locator('.release-card').first()).toContainText('entries');
});
