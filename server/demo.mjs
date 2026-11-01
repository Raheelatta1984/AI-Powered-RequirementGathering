import { createEngagement, saveAnswer, completeInterview, issueInvite } from './domain.mjs';
import { nextQuestion } from './questions.mjs';
import { defaultWorkspaceSettings } from './settings.mjs';
const availability = [1, 2, 3, 4, 5].map(day => ({ day, start: '09:00', end: '16:00' }));
const samples = {
  'business-driver': 'Example: Customer onboarding requests are handed between three teams. The business owner wants a single intake and clear ownership before the next intake review.',
  'current-process': 'Example: A customer request arrives by email, is entered in a spreadsheet, and is emailed to operations for review. The requester cannot see its current status.',
  'strategic-alignment': 'Example: The operations director owns the priority of reducing avoidable handoffs while maintaining a complete approval record.',
  'pain-point': 'Example: The same customer details are entered twice and follow-up emails are needed to locate the approver.',
  'problem-evidence': 'Example: The proposed baseline is 40 minutes per request, to be validated against a sample of 30 recent requests. This is illustrative, not a measured result.',
  'do-nothing': 'Example: Manual follow-up would remain with the operations team and request status would continue to depend on email.',
  'impacted-people': 'Example: Customer service representatives, operations approvers, new customers, and the operations manager are affected.',
  'decision-owner': 'Example: The operations director is the accountable business owner. Technology and security must confirm their respective constraints before release.',
  'adoption-barrier': 'Example: Teams may continue using email unless the new workflow is easier and managers reinforce the new process.',
  'success-metric': 'Example: Target a reduction from 40 to 25 minutes of staff effort per completed request within 60 days. Both values require baseline validation.',
  'measurement-owner': 'Example: Operations measures median handling effort weekly for the first 60 days, using a sample of completed requests.',
  'minimum-value': 'Example: A single request intake with an accountable approver and visible status would deliver the first useful increment.',
  'scope-boundary': 'Example: Include request intake, approval routing, and status visibility. Exclude payment processing and replacement of the customer record system.',
  'scope-exception': 'Example: Duplicate requests must be detected for review, and an urgent request needs a clearly identified escalation owner.',
  'scope-parking': 'Example: A customer-facing mobile app is parked for a later scope decision and is not part of this release.',
  'core-workflow': 'Example: A service representative submits a request, receives a reference, and the designated approver can approve or return it with a reason.',
  'business-rules': 'Example: Only the assigned approver or an authorised delegate can decide a request. Every decision records the actor, time, and reason.',
  'acceptance-example': 'Example: Given a valid request with a named customer and complete required fields, submission assigns the operations owner and displays a reference and pending-review status.',
  'service-level': 'Example: The proposed target is a two-second response for 95% of standard requests during business hours; the peak load and support window need confirmation.',
  'data-classification': 'Example: Customer contact details and request history are personal information. Storage location and retention must be confirmed by the privacy owner.',
  'access-retention': 'Example: Access is limited to the request team and authorised approvers. Export is restricted and retention follows a policy that is still to be confirmed.',
  'system-dependency': 'Example: The solution should use the existing identity provider and customer record. Interface ownership and available APIs need technical validation.',
  'release-constraint': 'Example: Use supported technology and avoid the quarter-end blackout. Exact dates and budget are not yet approved.',
  'technical-reservation': 'Example: The customer-record API contract, capacity, and licensing have not been verified. A prototype is required before committing to integration.',
  'threat-scenario': 'Example: Prevent one customer seeing another customer’s request, unauthorised approval, and disclosure through exported reports.',
  'mitigation-owner': 'Example: Technology owns authentication and access controls; security validates them. Backup restoration and audit monitoring need named operational owners.',
  'residual-risk': 'Example: Dependence on the customer-record system remains. The business owner must decide whether a manual fallback is acceptable.',
  'priority': 'Example: The core intake-to-approval workflow is the first priority because the other benefits depend on it. Must have for the initial release.',
  'trade-off': 'Example: Advanced reporting and additional team rollout can follow the core workflow.',
  'open-decision': 'Example: The privacy owner still needs to confirm retention and hosting location. The technology owner needs to validate the interface contract.',
};
function respond(e, person, count) {
  for (let i = 0; i < count; i++) {
    const q = nextQuestion(e, person); if (!q) break; person.pendingQuestion = q;
    saveAnswer(e, person, { questionId: q.id, text: samples[q.key] || 'Example: This needs confirmation from the accountable owner. The BA should obtain supporting evidence before making a delivery commitment.', disposition: 'answered', priority: q.phaseIndex === 9 ? 'Must have' : 'Should have', expectedVersion: e.revision }); e.revision++;
  }
}
export function seedDemo(catalog, settings = defaultWorkspaceSettings()) {
  const startDate = new Date().toISOString().slice(0, 10);
  const common = { startDate, sessionMinutes: 30, owner: 'Alex Morgan', objectives: 'Reduce avoidable onboarding effort and make request ownership visible.', constraints: 'Supported technology; confirm blackout periods and budget before delivery.' };
  const e = createEngagement({ ...common, title: 'Customer onboarding hub', type: 'new', problem: 'Bring customer request intake, approval, and status into one clear workflow, with evidence-led requirements from every impacted function.', scopeIn: 'Request intake, approval routing, status visibility, and audit history.', scopeOut: 'Payments, mobile applications, and replacing the customer system of record.', stakeholders: [
    { name: 'Olivia Chen', role: 'Operations director', function: 'Business', email: '', timezone: 'Australia/Sydney', availability },
    { name: 'Liam Patel', role: 'Integration lead', function: 'Technology', email: '', timezone: 'Australia/Sydney', availability },
    { name: 'Priya Shah', role: 'Security partner', function: 'Security', email: '', timezone: 'Australia/Sydney', availability },
  ] }, catalog, [], true, settings);
  e.stakeholders.forEach(p => issueInvite(e, p)); respond(e, e.stakeholders[0], 60); completeInterview(e, e.stakeholders[0], e.revision, true); e.revision++; respond(e, e.stakeholders[1], 12);
  // Illustrative pacing and presence so the progress board and reminders have something to show.
  const [olivia, liam, priya] = e.stakeholders;
  olivia.timeBudget = { minutes: 45, setAt: new Date(Date.now() - 3 * 86400000).toISOString() };
  liam.timeBudget = { minutes: 30, setAt: new Date(Date.now() - 3600000).toISOString() };
  liam.startedAt = new Date(Date.now() - 90 * 60000).toISOString();
  liam.lastSeenAt = new Date(Date.now() - 45 * 60000).toISOString();
  liam.activity = { status: 'active', note: '', updatedAt: liam.lastSeenAt, breakUntil: null };
  priya.activity = { status: 'on-break', note: 'Back after the leadership briefing', updatedAt: new Date().toISOString(), breakUntil: new Date(Date.now() + 20 * 60000).toISOString() };
  const existing = createEngagement({ ...common, title: 'A stronger requirements handoff', type: 'existing', solutionId: catalog.find(s => s.id === 'clarity-ba-workspace')?.id, baseline: 'The current repository implementation provides guided interviews, a completion gate, and a Markdown handoff. This example does not assert a production deployment.', desiredChange: 'Assess an improvement to the handoff experience, including downstream implementation traceability and adoption by BA leads.', problem: 'Explore a traceable improvement to the current Clarity workspace without losing stakeholder evidence or bypassing review.', scopeIn: 'Requirements handoff and implementation traceability.', scopeOut: 'Automated code deployment and production data migration.', stakeholders: [{ name: 'Alex Morgan', role: 'Senior BA lead', function: 'Business', email: '', timezone: 'Australia/Sydney', availability }] }, catalog, e.stakeholders.flatMap(p => p.schedule), true, settings);
  existing.stakeholders.forEach(p => issueInvite(existing, p)); return [e, existing];
}
