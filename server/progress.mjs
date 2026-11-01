// Interviewer visibility and gentle reminders. Stakeholders are never chased while they have
// paused, are on a break, or have said how much time they have available.
import { randomUUID } from 'node:crypto';
import { PHASES } from './questions.mjs';
import { DEFAULT_REMINDERS } from './settings.mjs';

const MINUTE = 60000;
const nowMs = now => (now instanceof Date ? now.getTime() : Date.parse(now));
const minutesBetween = (from, now) => (from ? Math.max(0, Math.round((nowMs(now) - Date.parse(from)) / MINUTE)) : null);

export function effectiveActivity(person, now = new Date()) {
  const activity = person.activity || {};
  if (person.status === 'completed') return { status: 'completed', label: 'Interview complete', note: activity.note || '', until: null, suppressReminders: true };
  if (activity.status === 'paused') return { status: 'paused', label: 'Paused by stakeholder', note: activity.note || '', until: null, suppressReminders: true };
  if (activity.status === 'on-break') {
    const until = activity.breakUntil || null;
    if (until && Date.parse(until) > nowMs(now)) return { status: 'on-break', label: 'On a break', note: activity.note || '', until, suppressReminders: true };
    return { status: 'idle', label: 'Break finished', note: '', until: null, suppressReminders: false };
  }
  const lastSeenAt = person.lastSeenAt || activity.lastSeenAt || person.responses.at(-1)?.at || null;
  if (!lastSeenAt) return { status: 'not-started', label: 'Invitation not opened', note: '', until: null, suppressReminders: false };
  const idle = minutesBetween(lastSeenAt, now);
  return { status: 'active', label: idle !== null && idle < 10 ? 'Active now' : 'Recently active', note: '', until: null, suppressReminders: false, lastSeenAt, idleMinutes: idle };
}

export function stakeholderProgress(e, person, now = new Date(), policy = DEFAULT_REMINDERS) {
  const activity = effectiveActivity(person, now);
  const lastSeenAt = person.lastSeenAt || person.activity?.lastSeenAt || person.responses.at(-1)?.at || person.completedAt || null;
  const lastAnswerAt = person.responses.at(-1)?.at || null;
  const idleMinutes = minutesBetween(lastSeenAt || lastAnswerAt, now);
  const idleThreshold = policy?.idleMinutes ?? DEFAULT_REMINDERS.idleMinutes;
  const phases = PHASES.map((phase, index) => {
    const responses = person.responses.filter(r => r.phaseIndex === index);
    const answered = responses.filter(r => ['answered', 'out-of-scope'].includes(r.disposition)).length;
    const core = responses.filter(r => !r.followup).length;
    return {
      index, name: phase.name, short: phase.short, responses: responses.length, answered,
      target: 3, followups: responses.filter(r => r.followup).length,
      status: core >= 3 ? 'complete' : responses.length ? 'in-progress' : 'not-started',
    };
  });
  const currentPhase = Math.min(PHASES.length - 1, person.responses.at(-1)?.phaseIndex ?? 0);
  const unanswered = person.pendingQuestion ? 1 : 0;
  const answered = person.responses.length;
  const behind = person.status !== 'completed' && !activity.suppressReminders && idleMinutes !== null && idleMinutes >= idleThreshold && (answered < 30 || unanswered > 0);
  const reminders = person.reminders || [];
  const unreadReminders = reminders.filter(r => !r.readAt).length;
  return {
    stakeholderId: person.id, name: person.name, role: person.role, function: person.function, status: person.status,
    activity: { ...activity, lastSeenAt, idleMinutes }, lastSeenAt, lastAnswerAt, idleMinutes, behind,
    responses: answered, answered: answered - person.responses.filter(r => ['unknown', 'skipped'].includes(r.disposition)).length,
    unknown: person.responses.filter(r => ['unknown', 'skipped'].includes(r.disposition)).length,
    percent: person.status === 'completed' ? 100 : Math.min(96, Math.round(new Set(person.responses.map(r => r.phaseIndex)).size / PHASES.length * 100)),
    currentPhase: person.status === 'completed' ? PHASES.length : currentPhase + 1,
    currentPhaseName: person.status === 'completed' ? 'Interview complete' : PHASES[currentPhase].name,
    awaitingAnswer: Boolean(person.pendingQuestion), phases,
    timeBudget: person.timeBudget || null, schedule: person.schedule,
    reminders: reminders.slice(-5), reminderCount: reminders.length, unreadReminders,
    pacing: pacingFor(person, now),
  };
}

export function pacingFor(person, now = new Date()) {
  const budget = person.timeBudget?.minutes ?? null;
  const startedAt = person.responses[0]?.at || person.startedAt || null;
  const elapsedMinutes = minutesBetween(startedAt, now);
  const remainingQuestions = Math.max(0, 30 - person.responses.length);
  const estimatedMinutesRemaining = person.status === 'completed' ? 0 : Math.max(1, Math.round(remainingQuestions * 1.4));
  const overBudget = budget !== null && elapsedMinutes !== null && elapsedMinutes + estimatedMinutesRemaining > budget;
  return {
    timeBudgetMinutes: budget, elapsedMinutes, estimatedMinutesRemaining,
    overBudget,
    message: budget === null
      ? `About ${estimatedMinutesRemaining} minutes of questions remain. Tell us how long you have and we will pace accordingly.`
      : overBudget
        ? `You allowed ${budget} minutes; roughly ${estimatedMinutesRemaining} minutes of questions remain. Pause and return to this link, or continue if you can.`
        : `You allowed ${budget} minutes; about ${estimatedMinutesRemaining} minutes of questions remain.`,
  };
}

export function engagementProgress(e, settings = {}, now = new Date()) {
  const policy = { ...DEFAULT_REMINDERS, ...(settings.reminders || {}) };
  const stakeholders = (e.stakeholders || []).map(person => stakeholderProgress(e, person, now, policy));
  return {
    engagementId: e.id, reminderPolicy: policy, stakeholders,
    summary: {
      total: stakeholders.length,
      completed: stakeholders.filter(s => s.status === 'completed').length,
      active: stakeholders.filter(s => s.activity.status === 'active').length,
      paused: stakeholders.filter(s => ['paused', 'on-break'].includes(s.activity.status)).length,
      notStarted: stakeholders.filter(s => s.activity.status === 'not-started').length,
      behind: stakeholders.filter(s => s.behind).length,
      awaitingAnswer: stakeholders.filter(s => s.awaitingAnswer).length,
    },
  };
}

export function reminderMessage(person, progress) {
  const where = progress?.currentPhaseName ? `You are on “${progress.currentPhaseName}” (question ${progress.responses + 1} of up to 30).` : '';
  return `A gentle reminder from your BA: your interview for this engagement is waiting. ${where} ${person.timeBudget?.minutes ? `You asked for ${person.timeBudget.minutes} minutes; ` : ''}Pause or take a break any time and reminders stop until you return.`.replace(/\s+/g, ' ').trim();
}

export function buildReminder(person, kind, message, now = new Date()) {
  return { id: `RM-${randomUUID().slice(0, 8).toUpperCase()}`, at: now.toISOString(), kind, message, channel: 'in-app', readAt: null, baReadAt: null };
}

const sameDay = (a, b) => new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

// Called on a timer and by an explicit BA action. Returns the reminders that were created.
export function sweepReminders(state, settings, now = new Date()) {
  const policy = { ...DEFAULT_REMINDERS, ...(settings?.reminders || {}) };
  if (policy.auto === false) return [];
  const created = [];
  for (const e of state.engagements || []) {
    if (e.status === 'delivered') continue;
    for (const person of e.stakeholders || []) {
      if (person.status === 'completed') continue;
      const progress = stakeholderProgress(e, person, now, policy);
      if (!progress.behind) continue;
      person.reminders ||= [];
      const todays = person.reminders.filter(r => sameDay(r.at, now)).length;
      if (todays >= policy.maxPerDay) continue;
      const last = person.reminders.at(-1);
      if (last && nowMs(now) - Date.parse(last.at) < policy.cooldownMinutes * MINUTE) continue;
      const reminder = buildReminder(person, 'auto', reminderMessage(person, progress), now);
      person.reminders.push(reminder);
      e.audit ||= [];
      e.audit.push({ id: `AUD-${randomUUID()}`, at: now.toISOString(), action: 'Automatic reminder sent to an inactive stakeholder', actor: 'System', stakeholderId: person.id, reminderId: reminder.id });
      created.push({ engagementId: e.id, engagementTitle: e.title, stakeholderId: person.id, stakeholderName: person.name, reminder });
    }
  }
  return created;
}

export function notificationFeed(state) {
  return (state.engagements || []).flatMap(e => (e.stakeholders || []).flatMap(person => (person.reminders || []).map(reminder => ({
    ...reminder, engagementId: e.id, engagementTitle: e.title, stakeholderId: person.id, stakeholderName: person.name,
  })))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
}

export function markNotificationsRead(state, { engagementId, stakeholderId } = {}) {
  let changed = 0;
  for (const e of state.engagements || []) {
    if (engagementId && e.id !== engagementId) continue;
    for (const person of e.stakeholders || []) {
      if (stakeholderId && person.id !== stakeholderId) continue;
      for (const reminder of person.reminders || []) { if (!reminder.baReadAt) { reminder.baReadAt = new Date().toISOString(); changed++; } }
    }
  }
  return changed;
}
