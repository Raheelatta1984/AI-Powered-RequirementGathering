import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { engagementInput, answerInput, reviewInput, changePlanInput } from './schema.mjs';
import { scheduleRoster } from './scheduler.mjs';
import { PHASES, PART_PHASES, nextQuestion, interviewProgress } from './questions.mjs';

export class AppError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export const assert = (condition, message, status = 400) => { if (!condition) throw new AppError(message, status); };
export const hashToken = token => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
const stamp = () => new Date().toISOString();
export function audit(e, action, actor = 'BA lead', details = {}) { e.audit.push({ id: randomUUID(), at: stamp(), action, actor, ...details }); }
export function version(e, expected) { assert(e.revision === expected, 'This record changed in another window. Refresh before continuing.', 409); }
export function publicPerson(person) { const { tokenHash, pendingQuestion, ...safe } = person; return safe; }
export function publicEngagement(e) { return { ...e, stakeholders: e.stakeholders.map(publicPerson) }; }
export function occupiedSlots(engagements, exceptId) { return engagements.filter(e => e.id !== exceptId && e.status !== 'delivered').flatMap(e => e.stakeholders.filter(p => p.status !== 'completed').flatMap(p => p.schedule)); }
export function createEngagement(raw, catalog, occupied = [], isExample = false) {
  const input = engagementInput.parse(raw);
  const solution = input.type === 'existing' ? catalog.find(s => s.id === input.solutionId) : null;
  assert(input.type !== 'existing' || solution, 'The selected solution is no longer in the catalog.');
  assert(!solution || solution.status !== 'Documentation only', 'A specification-only entry is not a deployed solution. Choose an actual solution or add its verified inventory record.');
  const roster = scheduleRoster(input.stakeholders.map(p => ({ ...p, id: randomUUID() })), input.startDate, input.sessionMinutes, occupied);
  const e = {
    id: `ENG-${randomBytes(4).toString('hex').toUpperCase()}`, schemaVersion: 12, revision: 0,
    ...input, solutionSnapshot: solution ? structuredClone(solution) : null, isExample,
    createdAt: stamp(), updatedAt: stamp(), status: 'interviewing', validationPrepared: false,
    stakeholders: roster.map(p => ({ ...p, tokenHash: '', status: 'invited', responses: [], questions: [], reopenedQuestions: [], summaryConfirmed: false, completedAt: null })),
    validations: [], validationHistory: [], reviews: [], changePlan: emptyChangePlan(), artifacts: [], audit: [],
  };
  audit(e, 'Engagement created; roster locked and sittings scheduled', 'BA lead', { stakeholderCount: roster.length });
  return e;
}
export function issueInvite(e, person) { const token = newToken(); person.tokenHash = hashToken(token); person.inviteExpiresAt = new Date(Date.now() + 90 * 86400000).toISOString(); audit(e, 'Private interview link issued or rotated', 'BA lead', { stakeholderId: person.id }); return token; }
export function emptyChangePlan() { return { sponsor: '', impact: '', adkar: Object.fromEntries(['awareness', 'desire', 'knowledge', 'ability', 'reinforcement'].map(k => [k, { action: '', owner: '', measure: '' }])) }; }
export function allInterviewsComplete(e) { return e.stakeholders.length > 0 && e.stakeholders.every(p => p.status === 'completed' && p.summaryConfirmed); }
export function stage(e) {
  if (e.status === 'delivered') return 'delivered';
  if (!allInterviewsComplete(e)) return 'interviewing';
  if (!e.validationPrepared || e.validations.some(v => v.status !== 'resolved')) return 'validating';
  return 'review';
}
export function syncStage(e) { if (e.status !== 'delivered') e.status = stage(e); e.updatedAt = stamp(); }
function invalidateReviews(e, reason) { if (e.reviews.length) audit(e, 'Review approvals invalidated', 'System', { reason }); e.reviews = []; }
export function saveAnswer(e, person, raw, actor = person.name) {
  assert(e.status !== 'delivered', 'This handoff is locked. Create a new change engagement for further changes.', 409);
  assert(person.status !== 'completed', 'This interview is already complete. Ask the BA to reopen a specific question.', 409);
  const input = answerInput.parse(raw); version(e, input.expectedVersion);
  const q = person.pendingQuestion || nextQuestion(e, person);
  assert(q && q.id === input.questionId, 'This question has changed. Refresh the interview.', 409);
  const response = { id: `EV-${randomBytes(5).toString('hex').toUpperCase()}`, questionId: q.id, questionKey: q.key, question: q.question, phaseIndex: q.phaseIndex, phase: PHASES[q.phaseIndex].name, text: input.text, disposition: input.disposition, priority: input.priority, at: stamp(), followup: Boolean(q.followup), reopened: Boolean(q.reopened), engine: q.engine || 'guided', recordedBy: actor };
  person.responses.push(response); person.pendingQuestion = null; person.status = 'interviewing';
  if (q.reopened) { const request = person.reopenedQuestions.find(item => item.id === q.id); if (request) request.answered = true; }
  audit(e, 'Interview response saved', actor, { stakeholderId: person.id, responseId: response.id, phase: response.phase, disposition: response.disposition });
  invalidateReviews(e, 'New interview evidence'); syncStage(e); return response;
}
export function completeInterview(e, person, expectedVersion, confirmed, actor = person.name) {
  version(e, expectedVersion); assert(confirmed === true, 'Confirm the summary before completing your interview.');
  assert(!nextQuestion(e, person), 'Answer or explicitly mark all remaining questions before completing.', 409);
  assert(person.status !== 'completed', 'Interview is already complete.', 409);
  person.status = 'completed'; person.summaryConfirmed = true; person.completedAt = stamp(); person.pendingQuestion = null;
  audit(e, 'Stakeholder confirmed and completed interview', actor, { stakeholderId: person.id, responses: person.responses.length });
  if (allInterviewsComplete(e) && !e.validationPrepared) prepareValidation(e);
  syncStage(e);
}
const norm = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function targetFor(e, source, area) {
  const desired = area === 'security' ? 'Security' : area === 'technical' ? 'Technology' : 'Business';
  return e.stakeholders.find(p => p.id !== source.id && p.function === desired) || e.stakeholders.find(p => p.id !== source.id && p.function !== source.function) || e.stakeholders.find(p => p.id !== source.id) || source;
}
function addCheck(e, target, source, kind, area, prompt, evidenceIds) {
  e.validations.push({ id: `VF-${randomBytes(4).toString('hex').toUpperCase()}`, targetId: target.id, sourceId: source.id, kind, area, prompt, evidenceIds, status: 'open', answer: null, resolution: null, createdAt: stamp(), singleSource: target.id === source.id });
}
export function prepareValidation(e) {
  assert(allInterviewsComplete(e), 'Every stakeholder must complete their interview first.', 409);
  const keys = ['success-metric', 'data-classification', 'release-constraint', 'priority'];
  for (const key of keys) {
    const answers = e.stakeholders.map(p => ({ person: p, response: p.responses.filter(r => r.questionKey === key && r.disposition === 'answered').at(-1) })).filter(x => x.response);
    const distinct = new Set(answers.map(x => norm(x.response.text)));
    if (distinct.size > 1) {
      const source = answers[0]; const target = targetFor(e, source.person, key === 'data-classification' ? 'security' : key === 'release-constraint' ? 'technical' : 'business');
      addCheck(e, target, source.person, 'conflict', key, `Different perspectives were recorded for ${key.replaceAll('-', ' ')}. Review the attributed statements below and confirm the authoritative position, evidence, and any exceptions. Do not assume either statement is correct.\n\n${answers.map(x => `${x.person.name} (${x.person.function}): ${x.response.text}`).join('\n\n')}`, answers.map(x => x.response.id));
    }
  }
  for (const [area, phaseIndex, question] of [
    ['security', 6, 'Verify the data classification, least-privilege access, retention, audit, and recovery requirements. Which are confirmed, who owns each control, and what still needs a security assessment?'],
    ['technical', 7, 'Verify the system dependencies, interface ownership, capacity, migration, supportability, and rollback assumptions. What evidence supports them, and what must be prototyped before build?'],
  ]) {
    const candidates = e.stakeholders.flatMap(p => p.responses.filter(r => r.phaseIndex === phaseIndex && !r.followup).map(response => ({ person: p, response })));
    const source = candidates.find(x => x.response.disposition === 'unknown') || candidates[0];
    if (source) { const target = targetFor(e, source.person, area); addCheck(e, target, source.person, 'coverage', area, question, candidates.map(x => x.response.id)); }
  }
  if (!e.validations.length) { const p = e.stakeholders[0]; addCheck(e, p, p, 'coverage', 'business', 'Confirm the measurable outcome and the evidence supporting it before BA review.', p.responses.slice(0, 3).map(r => r.id)); }
  e.validationPrepared = true;
  audit(e, 'Cross-functional verification prepared', 'System', { checks: e.validations.length, singleSource: e.stakeholders.length === 1 });
}
export function answerVerification(e, person, id, input) {
  assert(e.status !== 'delivered', 'Handoff is locked.', 409); version(e, input.expectedVersion);
  const check = e.validations.find(v => v.id === id && v.targetId === person.id);
  assert(check, 'Verification task not found for this stakeholder.', 404); assert(check.status === 'open', 'This verification has already been answered.', 409);
  check.answer = { text: input.text, at: stamp(), by: person.name }; check.status = 'answered';
  audit(e, 'Cross-functional verification answered', person.name, { validationId: id }); invalidateReviews(e, 'New verification evidence'); syncStage(e);
}
export function resolveVerification(e, id, input) {
  assert(e.status !== 'delivered', 'Handoff is locked.', 409); version(e, input.expectedVersion);
  const check = e.validations.find(v => v.id === id); assert(check, 'Verification task not found.', 404); assert(check.answer, 'The assigned stakeholder must answer before the BA can resolve this check.', 409); assert(check.status !== 'resolved', 'Already resolved.', 409);
  check.status = 'resolved'; check.resolution = { text: input.resolution, at: stamp(), by: 'BA lead' };
  audit(e, 'Verification resolved by BA', 'BA lead', { validationId: id }); syncStage(e);
}
export function reopenInterview(e, person, question, expectedVersion) {
  assert(e.status !== 'delivered', 'Handoff is locked.', 409); version(e, expectedVersion); assert(question.trim().length >= 15 && question.length <= 1200, 'Use a specific clarification question (15–1,200 characters).');
  e.validationHistory.push(...e.validations.map(v => ({ ...v, archivedAt: stamp() }))); e.validations = []; e.validationPrepared = false;
  person.status = 'interviewing'; person.summaryConfirmed = false; person.completedAt = null; person.pendingQuestion = null;
  person.reopenedQuestions.push({ id: `RQ-${randomBytes(4).toString('hex').toUpperCase()}`, question: question.trim(), key: 'ba-clarification', phaseIndex: 9, phase: PHASES[9].name, hint: 'Your BA requested this clarification. Previous answers are retained.', suggestions: ['I can confirm the original answer', 'Here is a correction with evidence', 'A specialist needs to confirm', 'This remains an open decision', 'The scope should be adjusted'], reopened: true });
  invalidateReviews(e, 'Interview reopened'); audit(e, 'Interview reopened for clarification', 'BA lead', { stakeholderId: person.id }); syncStage(e);
}
export function saveReview(e, raw) {
  assert(e.status !== 'delivered', 'Handoff is locked.', 409); const input = reviewInput.parse(raw); version(e, input.expectedVersion);
  assert(allInterviewsComplete(e), 'All stakeholder interviews must be complete before review.', 409);
  assert(e.validationPrepared && e.validations.every(v => v.status === 'resolved'), 'Resolve every cross-functional check before recording approval.', 409);
  e.reviews = e.reviews.filter(r => r.area !== input.area);
  e.reviews.push({ ...input, at: stamp(), evidenceRevision: e.revision + 1 });
  audit(e, `${input.area} review ${input.decision}`, input.reviewer, { notes: input.notes }); syncStage(e);
}
export function saveChangePlan(e, raw) {
  assert(e.status !== 'delivered', 'Handoff is locked.', 409); const input = changePlanInput.parse(raw); version(e, input.expectedVersion);
  const { expectedVersion, ...plan } = input; e.changePlan = plan;
  invalidateReviews(e, 'Change plan updated'); audit(e, 'Prosci-informed change plan updated'); syncStage(e);
}
export function gateReasons(e) {
  const reasons = [];
  const incomplete = e.stakeholders.filter(p => p.status !== 'completed' || !p.summaryConfirmed);
  if (incomplete.length) reasons.push(`${incomplete.length} stakeholder interview${incomplete.length === 1 ? '' : 's'} not complete`);
  if (!e.validationPrepared) reasons.push('Cross-functional verification has not run');
  const checks = e.validations.filter(v => v.status !== 'resolved').length;
  if (checks) reasons.push(`${checks} verification check${checks === 1 ? '' : 's'} awaiting an answer or BA resolution`);
  for (const area of ['business', 'technical', 'security', 'change']) if (!e.reviews.some(r => r.area === area && r.decision === 'approved')) reasons.push(`${area[0].toUpperCase() + area.slice(1)} review approval required`);
  if (!e.changePlan.sponsor.trim() || !e.changePlan.impact.trim()) reasons.push('Change sponsor and impact assessment required');
  for (const [key, value] of Object.entries(e.changePlan.adkar)) if (!value.action.trim() || !value.owner.trim() || !value.measure.trim()) reasons.push(`ADKAR ${key}: action, owner, and measure required`);
  return reasons;
}
export function requirementsFor(e) {
  return PHASES.map((phase, index) => {
    const responses = e.stakeholders.flatMap(p => p.responses.filter(r => r.phaseIndex === index).map(r => ({ ...r, stakeholderId: p.id, stakeholder: p.name, function: p.function })));
    const substantive = responses.filter(r => r.disposition === 'answered' || r.disposition === 'out-of-scope');
    if (!substantive.length) return null;
    const priority = substantive.filter(r => r.priority).at(-1)?.priority || 'Should have';
    const unknown = responses.filter(r => ['unknown', 'skipped'].includes(r.disposition)).length;
    const coverage = Math.max(1, Math.min(10, 3 + Math.min(substantive.length, 4) + (substantive.some(r => /\d/.test(r.text)) ? 2 : 0) + (substantive.some(r => /owner|approve|accountable/i.test(r.text)) ? 1 : 0) - unknown));
    return { id: `REQ-${String(index + 1).padStart(3, '0')}`, phaseIndex: index, title: phase.name, statements: substantive, evidenceIds: responses.map(r => r.id), priority, scope: substantive.some(r => r.disposition === 'out-of-scope') ? 'Boundary review' : 'Proposed in scope', coverage, unknown, acceptanceCriteria: [] };
  }).filter(Boolean);
}
export function summary(e) {
  const completed = e.stakeholders.filter(p => p.status === 'completed').length;
  return { id: e.id, title: e.title, type: e.type, owner: e.owner, problem: e.problem, status: stage(e), isExample: e.isExample, createdAt: e.createdAt, updatedAt: e.updatedAt, revision: e.revision, stakeholderCount: e.stakeholders.length, stakeholderNames: e.stakeholders.map(p => p.name), completed, responses: e.stakeholders.reduce((n, p) => n + p.responses.length, 0), requirementCount: requirementsFor(e).length, openChecks: e.validations.filter(v => v.status !== 'resolved').length, solution: e.solutionSnapshot?.name || null, nextSitting: e.stakeholders.flatMap(p => p.status === 'completed' ? [] : p.schedule.filter(slot => slot.startUtc >= new Date().toISOString())).sort((a, b) => a.startUtc.localeCompare(b.startUtc))[0] || null, gateReasons: gateReasons(e) };
}
