import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { createEngagement, saveAnswer, addStakeholder, setChangeManagement, gateReasons, saveChangePlan, saveReview, saveDetail, recordActivity, setTimeBudget, sendReminder, reviewAreas, elaborateFor } from '../server/domain.mjs';
import { nextQuestion, suggestPriority, strongestPriority } from '../server/questions.mjs';
import { elaborateGuided, sameDigits } from '../server/elaborate.mjs';
import { sweepReminders, effectiveActivity, stakeholderProgress } from '../server/progress.mjs';
import { defaultWorkspaceSettings, defaultChangeManagement } from '../server/settings.mjs';
import { parseChangelog } from '../server/changelog.mjs';

const availability = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, start: '08:00', end: '18:00' }));
const person = (name, func = 'Business') => ({ name, role: `${func} reviewer`, function: func, email: '', timezone: 'Australia/Sydney', availability });
const start = () => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const input = (people = [person('Alex Morgan')]) => ({ title: 'Detailed requirements', problem: 'A sufficiently detailed problem statement for testing.', owner: 'Alex Morgan', type: 'new', scopeIn: 'The core workflow', scopeOut: 'Payments', startDate: start(), sessionMinutes: 30, stakeholders: people });
const settingsWith = (change = {}) => { const settings = defaultWorkspaceSettings(); settings.changeManagement = { ...defaultChangeManagement(), ...change }; return settings; };
const answer = (e, p, text, extra = {}) => { const q = nextQuestion(e, p); p.pendingQuestion = q; const response = saveAnswer(e, p, { questionId: q.id, text, disposition: 'answered', expectedVersion: e.revision, ...extra }); e.revision++; return { q, response }; };

test('every answered question is elicited into a detailed statement with explicit gaps', () => {
  const e = createEngagement(input(), [], [], false, settingsWith());
  const p = e.stakeholders[0];
  const { response } = answer(e, p, 'We need this to be faster.', { priority: 'Must have' });
  assert.equal(response.text, 'We need this to be faster.');
  assert.match(response.detail, /Requirement implication/);
  assert.match(response.detail, /Still to confirm|specific enough/);
  assert.ok(response.detailGaps.some(gap => /measurable/i.test(gap)));
  assert.ok(response.detailGaps.some(gap => /owner/i.test(gap)));
  assert.ok(response.detailGaps.some(gap => /faster/i.test(gap)));
  assert.equal(response.detailEngine, 'guided');
  assert.ok(response.detail.length > response.text.length);
  // The guided expansion never invents a number that the stakeholder did not supply.
  assert.ok(sameDigits(response.text, response.detail));
  const guided = elaborateGuided({ question: 'What is the target?', answer: 'Reduce handling effort from 40 to 25 minutes by the operations team.', phase: { purpose: 'Define measurable success.' }, person: { name: 'A', role: 'Ops lead', function: 'Operations' }, priority: 'Must have' });
  assert.ok(!guided.gaps.some(gap => /measurable baseline/i.test(gap)));
  assert.match(guided.text, /40/);
  assert.ok(sameDigits('40 to 25', guided.text));
  // A stakeholder can refine the detailed version; their wording is attributed.
  saveDetail(e, p, response.id, { text: 'Operations needs the intake step to complete in two seconds so representatives stop re-entering details.', expectedVersion: e.revision });
  assert.equal(p.responses[0].detailEngine, 'stakeholder-edited');
  assert.equal(p.responses[0].detailEditedBy, 'Alex Morgan');
  assert.equal(p.responses[0].text, 'We need this to be faster.');
});

test('MoSCoW auto-adjusts from the question and a stakeholder override is retained', () => {
  const e = createEngagement(input(), [], [], false, settingsWith());
  const p = e.stakeholders[0];
  assert.equal(suggestPriority({ key: 'success-metric', question: 'What measurable outcome would tell us this has succeeded?' }, p).value, 'Must have');
  assert.equal(suggestPriority({ key: 'scope-parking', question: 'Is there anything outside the agreed scope?' }, p).value, "Won't have this release");
  assert.equal(suggestPriority({ key: 'data-classification', question: 'What information is handled?' }, { function: 'Security' }).value, 'Must have');
  assert.match(suggestPriority({ key: 'success-metric', question: 'What measurable outcome?' }, p).reason, /outcome/i);
  const auto = answer(e, p, 'Reduce median handling effort from 40 to 25 minutes within 60 days.');
  assert.equal(auto.response.prioritySource, 'auto');
  assert.ok(auto.response.priorityReason);
  assert.equal(auto.response.priority, 'Must have');
  const contextual = answer(e, p, 'A request arrives by email and is copied into a spreadsheet by hand.');
  assert.equal(contextual.response.priority, 'Should have');
  assert.match(contextual.response.priorityReason, /Context/);
  const second = answer(e, p, 'A current process creating delays, to be measured weekly.', { priority: 'Could have' });
  assert.equal(second.response.priority, 'Could have');
  assert.equal(second.response.prioritySource, 'stakeholder');
  assert.equal(strongestPriority(['Could have', 'Must have', 'Should have']), 'Must have');
});

test('change management is optional: no Prosci gate by default, enabled per engagement on demand', () => {
  const e = createEngagement(input(), [], [], false, defaultWorkspaceSettings());
  assert.equal(e.changeManagement.enabled, false);
  assert.deepEqual(reviewAreAreasFor(e), ['business', 'technical', 'security']);
  assert.ok(!gateReasons(e).some(reason => /ADKAR|sponsor|Change review/i.test(reason)));
  assert.throws(() => saveChangePlan(e, { sponsor: 'A', impact: 'B', adkar: {}, expectedVersion: e.revision }), /optional/);
  setChangeManagement(e, { enabled: true, changeReview: true, expectedVersion: e.revision }); e.revision++;
  assert.equal(e.changeManagement.enabled, true);
  assert.deepEqual(reviewAreAreasFor(e), ['business', 'technical', 'security', 'change']);
  assert.ok(gateReasons(e).some(reason => /ADKAR awareness/.test(reason)));
  assert.ok(gateReasons(e).some(reason => /Change review/.test(reason)));
  setChangeManagement(e, { enabled: true, adkar: { awareness: false, desire: false, knowledge: false, ability: false, reinforcement: false }, phases: { prepare: false, manage: false, sustain: false }, changeReview: false, expectedVersion: e.revision }); e.revision++;
  assert.ok(!gateReasons(e).some(reason => /ADKAR|sponsor|Change review/i.test(reason)));
  // With the master setup off, the people-and-adoption review area is not available at all.
  setChangeManagement(e, { enabled: false, expectedVersion: e.revision }); e.revision++;
  assert.throws(() => saveReview(e, { area: 'change', reviewer: 'Reviewer', role: 'Lead', decision: 'approved', notes: 'Reviewed the plan with evidence.', expectedVersion: e.revision }), /only available when change management/);
  function reviewAreAreasFor(engagement) { return reviewAreas(engagement); }
});

test('additional stakeholders are invited at any time and run in parallel', () => {
  const e = createEngagement(input(), [], [], false, settingsWith({ enabled: true }));
  const first = e.stakeholders[0];
  const parallel = addStakeholder(e, { ...person('Priya Shah', 'Security'), availability }, [], settingsWith({ enabled: true }));
  assert.equal(e.stakeholders.length, 2);
  // Parallel sittings line up with the existing stakeholder instead of being pushed to later days.
  assert.equal(parallel.person.schedule[0].startUtc, first.schedule[0].startUtc);
  assert.ok(parallel.token && parallel.token.length === 43);
  assert.ok(!JSON.stringify(e).includes(parallel.token));
  const serialSettings = settingsWith(); serialSettings.interview = { ...serialSettings.interview, parallelSittings: false };
  const e2 = createEngagement(input(), [], [], false, serialSettings);
  const serial = addStakeholder(e2, { ...person('Taylor Lee', 'Technology'), availability }, [], serialSettings);
  assert.notEqual(serial.person.schedule[0].startUtc, e2.stakeholders[0].schedule[0].startUtc);
  // Adding a stakeholder archives prepared checks and invalidates approvals.
  e.validationPrepared = true; e.validations = [{ id: 'VF-OLD', targetId: first.id, sourceId: first.id, status: 'open', evidenceIds: [] }];
  e.reviews = [{ area: 'business', decision: 'approved' }];
  addStakeholder(e, { ...person('Sam Lee', 'Technology'), availability }, [], settingsWith());
  assert.equal(e.validations.length, 0);
  assert.equal(e.validationPrepared, false);
  assert.equal(e.reviews.length, 0);
  assert.equal(e.validationHistory.length, 1);
});

test('stakeholders record available time; pause and break suspend reminders', () => {
  const e = createEngagement(input(), [], [], false, settingsWith());
  const p = e.stakeholders[0];
  setTimeBudget(e, p, { minutes: 30, expectedVersion: e.revision }); e.revision++;
  assert.equal(p.timeBudget.minutes, 30);
  const progress = stakeholderProgress(e, p);
  assert.match(progress.pacing.message, /30 minutes/);
  // An inactive stakeholder with work left is behind.
  p.responses = [{ id: 'EV-1', phaseIndex: 0, at: new Date(Date.now() - 90 * 60000).toISOString(), disposition: 'answered' }];
  p.lastSeenAt = new Date(Date.now() - 90 * 60000).toISOString();
  p.activity = { status: 'active', note: '', updatedAt: p.lastSeenAt, breakUntil: null };
  assert.equal(stakeholderProgress(e, p).behind, true);
  recordActivity(e, p, { status: 'paused', note: 'Back tomorrow' });
  assert.equal(effectiveActivity(p).status, 'paused');
  assert.equal(stakeholderProgress(e, p).behind, false);
  const state = { engagements: [e] };
  assert.equal(sweepReminders(state, defaultWorkspaceSettings()).length, 0);
  recordActivity(e, p, { status: 'on-break', minutes: 30 });
  assert.equal(effectiveActivity(p).status, 'on-break');
  assert.equal(sweepReminders(state, defaultWorkspaceSettings()).length, 0);
  recordActivity(e, p, { status: 'active' });
  p.lastSeenAt = new Date(Date.now() - 120 * 60000).toISOString();
  assert.equal(stakeholderProgress(e, p).behind, true);
  const reminders = sweepReminders(state, defaultWorkspaceSettings());
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].reminder.kind, 'auto');
  assert.equal(reminders[0].reminder.channel, 'in-app');
  assert.match(reminders[0].reminder.message, /pause|break/i);
  // The cooldown prevents a second automatic reminder straight away.
  assert.equal(sweepReminders(state, defaultWorkspaceSettings()).length, 0);
  const manual = sendReminder(e, p, { message: 'Your BA would value your answer on outcomes when you have a moment.', expectedVersion: e.revision });
  assert.equal(manual.kind, 'manual');
  assert.equal(p.reminders.length, 2);
});

test('workspace settings, progress, changelog, and interview endpoints work over HTTP', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'clarity-v13-'));
  const store = await createStore(dir);
  const app = createApp(store, { reminderSweepMs: 0 });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const call = async (path, body, method) => { const response = await fetch(`${base}/api${path}`, { method: method || (body ? 'POST' : 'GET'), headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); const type = response.headers.get('content-type'); return { status: response.status, body: type?.includes('json') ? await response.json() : await response.text() }; };

  const settings = await call('/settings'); assert.equal(settings.status, 200); assert.equal(settings.body.settings.changeManagement.enabled, false);
  const updated = await call('/settings', { ...settings.body.settings, changeManagement: { ...settings.body.settings.changeManagement, enabled: true, changeReview: true } }, 'PUT');
  assert.equal(updated.status, 200); assert.equal(updated.body.settings.changeManagement.enabled, true);
  const config = await call('/config'); assert.equal(config.body.version, '13.0.0'); assert.equal(config.body.settings.changeManagement.enabled, true);

  const changelog = await call('/changelog'); assert.ok(changelog.body.releases.length >= 3); assert.ok(changelog.body.counts.future >= 1); assert.ok(changelog.body.counts.past >= 1); assert.ok(changelog.body.counts.present >= 1);

  const created = await call('/engagements', { ...input(), startDate: start() }); assert.equal(created.status, 201);
  const e = created.body.engagement; const token = created.body.invites[0].token;
  assert.equal(e.changeManagement.enabled, true); assert.deepEqual(e.reviewAreas, ['business', 'technical', 'security', 'change']);
  assert.ok(!('tokenHash' in e.stakeholders[0]));

  let view = (await call(`/interviews/${token}`)).body;
  assert.equal(view.askTimeBudget, true); assert.equal(view.suggestedTimeBudget, 30);
  const budget = await call(`/interviews/${token}/time-budget`, { minutes: 45, expectedVersion: view.engagement.revision });
  assert.equal(budget.status, 200); assert.equal(budget.body.timeBudget.minutes, 45);
  const active = await call(`/interviews/${token}/activity`, { status: 'active', expectedVersion: budget.body.revision });
  assert.equal(active.status, 200); assert.equal(active.body.activity.status, 'active');
  assert.equal(active.body.revision, budget.body.revision, 'presence updates must not change the record revision');

  view = (await call(`/interviews/${token}/next`, {})).body;
  assert.ok(view.question.prioritySuggestion.value);
  assert.ok(view.question.suggestions.length >= 3);
  const answered = await call(`/interviews/${token}/answer`, { questionId: view.question.id, text: 'Requests are handed between three teams and nobody can confirm the current status.', disposition: 'answered', expectedVersion: view.engagement.revision });
  assert.equal(answered.status, 200);
  assert.ok(answered.body.response.detail.length > answered.body.response.text.length);
  assert.equal(answered.body.response.prioritySource, 'auto');
  const refined = await call(`/interviews/${token}/responses/${answered.body.response.id}/detail`, { text: 'Requests need a single intake with a visible owner so representatives stop chasing each other for status.', expectedVersion: answered.body.revision });
  assert.equal(refined.status, 200); assert.equal(refined.body.response.detailEngine, 'stakeholder-edited');

  const added = await call(`/engagements/${e.id}/stakeholders`, { ...person('Priya Shah', 'Security'), availability, expectedVersion: refined.body.revision });
  assert.equal(added.status, 201); assert.ok(added.body.invite.token.length === 43); assert.equal(added.body.engagement.stakeholders.length, 2);
  assert.equal((await call(`/interviews/${added.body.invite.token}`)).status, 200);

  const progress = await call(`/engagements/${e.id}/progress`); assert.equal(progress.status, 200);
  assert.equal(progress.body.stakeholders.length, 2); assert.ok(progress.body.stakeholders[0].phases.length === 10);
  const reminder = await call(`/engagements/${e.id}/reminders/${e.stakeholders[0].id}`, { message: 'When you have a moment, your answer on outcomes is the next thing we need.', expectedVersion: progress.body.stakeholders.length ? (await call(`/engagements/${e.id}`)).body.engagement.revision : 0 });
  assert.equal(reminder.status, 200); assert.equal(reminder.body.result.kind, 'manual');
  const notifications = await call('/notifications'); assert.equal(notifications.status, 200); assert.ok(notifications.body.notifications.length >= 1);
  const stakeholderView = (await call(`/interviews/${token}`)).body;
  assert.ok(stakeholderView.reminders.length >= 1);
  assert.equal((await call(`/interviews/${token}/reminders/read`, {})).status, 200);
  assert.equal((await call('/notifications/read', {})).status, 200);
});
