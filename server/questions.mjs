// Guided discovery framework: ten phases, three core questions per phase, and at most two
// targeted follow-ups. Suggestions are detailed, editable starting points — never evidence.
export const PHASES = [
  {
    name: 'Business context', short: 'Context', purpose: 'Understand the opportunity before discussing a solution.', questions: [
      ['business-driver', 'What is driving this change, and why does it matter now?', [
        'Customer requests are currently handled by three teams, which adds about two days of avoidable handoff. The intake review in November makes this urgent because every request needs a named owner before then.',
        'A reporting obligation starts next quarter. Our spreadsheet process cannot evidence who approved each change, so the risk of a qualified finding is increasing every month.',
        'Customers abandon onboarding when status is unclear. We estimate one in five new accounts stalls at that step, and the executive team has asked for a measured improvement this half.',
      ]],
      ['current-process', 'Walk me through how this work happens today, from start to finish.', [
        'A request arrives by email, I copy it into a spreadsheet, and I email operations for review. Operations replies with a decision, I update the sheet, then tell the customer. Nothing shows the current status.',
        'The customer calls the service desk, an agent logs a case, and it is assigned manually to a specialist. If the specialist is on leave the case waits and the agent re-explains the delay.',
        'Requests sit in a shared mailbox with 14 people watching it. Whoever opens the email owns it until completion, so ownership depends on who was first to read it that morning.',
      ]],
      ['strategic-alignment', 'Which business priority should this support, and who owns that priority?', [
        'This supports the operational efficiency priority owned by the operations director, with a secondary link to customer satisfaction measured in the quarterly service review.',
        'It supports the risk reduction priority owned by the chief risk officer. The compliance register records this as a control gap with an owner and a review date.',
        'It supports the customer experience priority owned by the head of customer operations. The target is tracked monthly in the service performance report.',
      ]],
    ]
  },
  {
    name: 'Problem & evidence', short: 'Problem', purpose: 'Separate observable problems from assumptions.', questions: [
      ['pain-point', 'Where does the current approach break down for you or your team?', [
        'The same customer details are entered twice, and chasing the approver takes several emails. Last week a request was closed twice because two people assumed the other had handled it.',
        'Approvals wait in an inbox until someone notices them. Our team spends roughly 40 minutes a day searching for the latest version of a request, and nobody can state the current owner.',
        'Information is re-keyed between the request tracker and the finance system. Errors appear at month end when the two records disagree and someone has to reconcile them manually.',
      ]],
      ['problem-evidence', 'What evidence shows the size of the problem? Include a recent example or baseline.', [
        'A sample of 30 recent requests shows a median of 40 minutes of staff effort and 2.5 days elapsed. I can share the anonymised extract from the tracker for validation.',
        'The service report shows 18 percent of requests are reopened within seven days. Two recent customer complaints reference the same missing status information.',
        'We have no measured baseline yet. The team logs roughly five rework incidents a week in a shared note, and I can provide the last six weeks for review.',
      ]],
      ['do-nothing', 'What happens if we leave this unchanged for the next six months?', [
        'Manual follow-up continues, the team absorbs another intake channel, and the audit finding remains open with a stated remediation date.',
        'Customer satisfaction keeps eroding at the status step, and support effort grows with each new customer rather than with value delivered.',
        'The compliance gap stays open past the review date, which carries a reporting consequence and makes the next audit harder to close.',
      ]],
    ]
  },
  {
    name: 'People & ownership', short: 'Stakeholders', purpose: 'Identify impacted people and decision rights.', questions: [
      ['impacted-people', 'Who uses this process, and who is affected when it goes wrong?', [
        'Customer service representatives raise requests, operations approvers decide them, and the operations manager answers when something is late. Customers feel every delay.',
        'The service desk, two specialist teams, and finance all touch the record. When a request is wrong, the customer and the account manager absorb the impact.',
        'Frontline staff enter the information, team leaders review it, and the risk team audits it quarterly. A failed control affects customers and the audit position.',
      ]],
      ['decision-owner', 'Who can approve the requirements, and who should be consulted before release?', [
        'The operations director approves the requirements. Technology and security must confirm their constraints, and the privacy owner is consulted about retention.',
        'A cross-functional steering group decides, chaired by the business owner, with technology, security, and change representation. I can nominate the members this week.',
        'The decision owner still needs confirming. My expectation is the head of operations, and until that is agreed no requirement should be treated as approved.',
      ]],
      ['adoption-barrier', 'What might make this change difficult for people to adopt?', [
        'People are comfortable with the current email process. If the new workflow adds steps or hides information, the team will keep using email and the data will fragment again.',
        'Training and support will be needed. Several team members are part-time, so knowledge must be captured in job aids rather than in a single briefing.',
        'The change affects roles and responsibilities: approvers gain a decision queue and managers gain visibility. That shift needs to be explained and reinforced by team leaders.',
      ]],
    ]
  },
  {
    name: 'Outcomes & measures', short: 'Outcomes', purpose: 'Define measurable success, not just activity.', questions: [
      ['success-metric', 'What measurable outcome would tell us this has succeeded? Please include the baseline and target if known.', [
        'Reduce median staff effort per completed request from a validated baseline of 40 minutes to 25 minutes within 60 days of release, measured from the tracker timestamps.',
        'Increase the share of requests completed without a follow-up email from an estimated 60 percent to 85 percent, reviewed weekly for the first quarter.',
        'We need to agree the baseline and target. My proposal is to measure elapsed time from receipt to decision and set a target once four weeks of data are available.',
      ]],
      ['measurement-owner', 'How and when will that outcome be measured, and who owns the result?', [
        'The operations manager owns the result and reviews the existing weekly performance report. The first comparison is four weeks after release.',
        'I will compare before-and-after samples of completed requests monthly. The measurement method is documented so the next reviewer can repeat it.',
        'An outcome owner still needs assigning. Until then the metric is a proposal and should not be used to declare success.',
      ]],
      ['minimum-value', 'What is the smallest improvement that would still deliver meaningful value?', [
        'Fixing the intake and approval steps for one team would remove the double entry and give a visible owner. Everything else can follow once that is stable.',
        'A single request form with a status view and one accountable approver would deliver the first useful increment without replacing any system.',
        'Delivering only the mandatory audit evidence would satisfy the obligation. The customer experience improvements could be deferred to a later release.',
      ]],
    ]
  },
  {
    name: 'Scope & boundaries', short: 'Scope', purpose: 'Make exclusions as explicit as inclusions.', questions: [
      ['scope-boundary', 'Which capabilities belong in this release, and which should stay out?', [
        'Include request intake, approval routing, status visibility, and the audit trail. Exclude payment processing, mobile apps, and replacing the customer system of record.',
        'Include the core workflow and reporting needed for the audit. Exclude bulk migration of historical records; those will be referenced read-only.',
        'I have a boundary to propose: include the service desk and operations teams only. Other intake channels remain unchanged until this is proven.',
      ]],
      ['scope-exception', 'Describe an important exception or edge case the solution must handle.', [
        'A duplicate request must be flagged for review rather than silently merged. An urgent request needs a named escalation owner and a visible priority.',
        'A request submitted with incomplete mandatory fields should be saved as a draft with a useful explanation, never lose the entered data.',
        'A decision must be reversible with a recorded reason, and the customer must be told what changed and who owns the next step.',
      ]],
      ['scope-parking', 'Is there anything outside the agreed scope that we should park for a later decision?', [
        'A customer-facing mobile app is parked for a later decision. It stays visible as an excluded item so nobody assumes it was forgotten.',
        'An additional integration with the finance system is parked until the interface contract is verified. That decision needs a named owner.',
        'An additional business unit wants to join later. It is parked, with the condition that the first release must not be delayed by their requirements.',
      ]],
    ]
  },
  {
    name: 'Functional needs', short: 'Functional', purpose: 'Capture observable behaviour and business rules.', questions: [
      ['core-workflow', 'What must a user be able to do, and what should happen immediately afterwards?', [
        'A representative submits a request and receives a reference immediately. The named approver is notified and can approve, return with a reason, or reassign with an audit record.',
        'A reviewer opens a queue of assigned requests, sees the evidence, and records a decision. The requester sees the new status and the next action within a minute.',
        'A team leader searches by reference, sees the full history, and can export the audit view. Every action records who did it and when.',
      ]],
      ['business-rules', 'What rules determine who can do what, or when an action is allowed?', [
        'Only the assigned approver or a recorded delegate can decide a request. A decision above the agreed value threshold needs a second approver.',
        'Requests cannot be closed without a decision reason. Reassignment requires a comment, and every change of owner is retained in the history.',
        'Access follows role and team ownership. Export is limited to the audit role, and the export itself is recorded with the requester and timestamp.',
      ]],
      ['acceptance-example', 'Give one concrete example of a correct result, including an input and expected outcome.', [
        'Given a complete request from an existing customer, when the representative submits it, then a reference is shown and the operations approver sees it in their queue within one minute.',
        'Given a request missing the mandatory customer identifier, when it is submitted, then it is saved as a draft with a clear message and no notification is sent.',
        'Given an approver outside the assigned team, when they attempt a decision, then the action is blocked and the attempt is recorded in the audit trail.',
      ]],
    ]
  },
  {
    name: 'Quality & security', short: 'Non-functional', purpose: 'Elicit measurable service, data, and protection needs.', questions: [
      ['service-level', 'What response time, availability, and capacity does your work actually require?', [
        'Standard screens should respond within two seconds for 95 percent of requests during business hours. The service must support the peak intake of about 120 requests a day.',
        'Availability is required during business hours with planned maintenance outside them. Response-time targets need measurement before we commit to a number.',
        'The service must handle quarter-end peaks at roughly three times normal volume without manual intervention, with a documented support window.',
      ]],
      ['data-classification', 'What information is handled, how sensitive is it, and where must it be stored?', [
        'Customer contact details and request history are personal information. Storage must stay in the approved environment and retention must be confirmed by the privacy owner.',
        'Only internal business information is involved, but the audit trail becomes evidence and must not be editable by operational users.',
        'Regulated information is involved. The privacy and security owners must confirm classification, location, and retention before build.',
      ]],
      ['access-retention', 'Who may access or export the information, and how long should it be kept?', [
        'Access is limited to the request team and authorised approvers, with an audit trail of views and exports. Retention follows the approved records policy.',
        'Retention follows policy: seven years for decisions, with routine request detail removed after two years. The policy owner confirms the exact periods.',
        'Access and retention need specialist confirmation. Until that is recorded, treat both as unresolved decisions rather than assumptions.',
      ]],
    ]
  },
  {
    name: 'Technical & delivery constraints', short: 'Constraints', purpose: 'Surface dependencies and technical reservations early.', questions: [
      ['system-dependency', 'Which existing tools, interfaces, or system owners must this work fit with?', [
        'The solution must use the existing identity provider for sign-in and read customer records from the CRM. The CRM interface owner must confirm the contract and rate limits.',
        'Reporting uses the existing warehouse, which has a nightly load. Any near-real-time view needs a documented alternative and an owner for the pipeline.',
        'The dependency inventory needs confirming. My understanding is identity, CRM, and the service desk tool, but each needs an accountable owner before design.',
      ]],
      ['release-constraint', 'What dates, budgets, support limits, or blackout periods constrain the change?', [
        'There is a fixed regulatory date next quarter. The quarter-end blackout applies, and the delivery team must use currently supported technology versions.',
        'Budget is approved for the discovery and build only; support funding needs a decision. Change freeze applies for the last two weeks of each quarter.',
        'There are blackout periods to confirm and no approved delivery date yet. I would rather record the constraint than commit to a date we cannot support.',
      ]],
      ['technical-reservation', 'What technical assumption or limitation should the delivery team validate before building?', [
        'Interface availability and ownership are unverified. A short technical spike should confirm the CRM contract, authentication flow, and error behaviour.',
        'Data quality and migration effort are assumptions. The current extract has duplicate customer identifiers that must be profiled before design.',
        'Capacity, licensing, and supportability need validation. The proposed reporting view may require additional licensing and an operational support owner.',
      ]],
    ]
  },
  {
    name: 'Risks & safeguards', short: 'Risks', purpose: 'Identify threats, consequences, and accountable owners.', questions: [
      ['threat-scenario', 'What misuse, failure, or unintended outcome should we actively prevent?', [
        'Prevent one customer seeing another customer request, prevent unauthorised approval, and prevent disclosure through an exported report.',
        'Prevent silent alteration of an approval decision and prevent a failed integration from leaving requests in an unknown state.',
        'Prevent loss of requests during migration and prevent an outage at quarter end, when manual recovery would not keep pace with demand.',
      ]],
      ['mitigation-owner', 'What safeguard or recovery capability is needed, and who will verify it?', [
        'Strong authentication with least-privilege roles, tested backup and restore, and monitoring with an accountable operational owner.',
        'Technology owns authentication and access control; security verifies them. Recovery and audit monitoring need named operational owners.',
        'Monitoring, escalation, and a tested rollback plan are needed. The service owner verifies recovery objectives and the security team verifies controls.',
      ]],
      ['residual-risk', 'Which risk needs an explicit acceptance decision before release?', [
        'Dependence on the CRM interface remains. The business owner must accept the manual fallback and its delay before release.',
        'A temporary manual workaround for reassignment will remain in the first release. Its owner and removal date need an explicit decision.',
        'A residual privacy risk remains until retention automation is delivered. The privacy owner must accept it or require it before release.',
      ]],
    ]
  },
  {
    name: 'Priority & confirmation', short: 'Priorities', purpose: 'Make trade-offs and remaining uncertainty visible.', questions: [
      ['priority', 'If only one capability could be delivered first, which would it be and why? Set its priority below.', [
        'The core intake-to-approval workflow with audit evidence comes first, because every other benefit depends on it and the audit obligation is dated.',
        'The highest-risk capability comes first: access control and approval evidence. Delivering convenience before control would not be defensible.',
        'The highest-value measured improvement comes first: removing double entry for the pilot team, which demonstrates value before wider rollout.',
      ]],
      ['trade-off', 'What could be deferred without preventing the main outcome?', [
        'Advanced reporting and expansion to additional teams can follow once the core workflow is stable and measured.',
        'Convenience features such as saved filters and bulk actions can be deferred without affecting the audit outcome.',
        'Nonessential integrations, including finance reconciliation, can be deferred if the core record and status are in place.',
      ]],
      ['open-decision', 'What remains uncertain, and what evidence or decision would close that gap?', [
        'The privacy owner must confirm retention and hosting location. The technology owner must validate the interface contract before design is fixed.',
        'A named owner needs to confirm support funding. A specialist review is required for the reporting data source before estimates are credible.',
        'No further uncertainty from my perspective, though I expect technology and security to record their own reservations for the review gate.',
      ]],
    ]
  },
];

export const PART_PHASES = [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]];
export const PART_NAMES = ['Discover the need', 'Define the solution', 'Validate & prioritise'];

const vague = /\b(faster|better|easy|secure|soon|improve|user[- ]friendly|efficient|intuitive)\b/i;
export function needsFollowup(response) { return response?.disposition === 'answered' && (response.text.length < 35 || (vague.test(response.text) && !/\d/.test(response.text))); }

// Auto-adjust the MoSCoW priority from the question being asked rather than defaulting every
// answer to "Should have". The stakeholder can always override; the reason is shown in the UI.
const PRIORITY_RULES = {
  'business-driver': ['Must have', 'Defines why the work exists, so it anchors every requirement.'],
  'current-process': ['Should have', 'Context that shapes design, but not itself a deliverable.'],
  'strategic-alignment': ['Must have', 'Links the work to an owned business priority.'],
  'pain-point': ['Should have', 'Shapes the problem statement; the outcome below carries the priority.'],
  'problem-evidence': ['Must have', 'Evidence decides whether the problem is real and measurable.'],
  'do-nothing': ['Could have', 'Useful for the business case; it does not change the build.'],
  'impacted-people': ['Must have', 'Determines who must be consulted, trained, and supported.'],
  'decision-owner': ['Must have', 'Without a decision owner, requirements cannot be approved.'],
  'adoption-barrier': ['Should have', 'Adoption risk is planned alongside delivery.'],
  'success-metric': ['Must have', 'A measurable outcome is required to accept the solution.'],
  'measurement-owner': ['Must have', 'An unowned measure cannot demonstrate success.'],
  'minimum-value': ['Should have', 'Defines the first useful increment for sequencing.'],
  'scope-boundary': ['Must have', 'Prevents scope drift and protects the release.'],
  'scope-exception': ['Must have', 'Edge cases decide whether the workflow is safe to use.'],
  'scope-parking': ["Won't have this release", 'Explicitly parked for a later decision.'],
  'core-workflow': ['Must have', 'The end-to-end workflow delivers the primary outcome.'],
  'business-rules': ['Must have', 'Rules govern who may act and when.'],
  'acceptance-example': ['Must have', 'A concrete example makes the requirement testable.'],
  'service-level': ['Must have', 'Performance and availability determine fitness for use.'],
  'data-classification': ['Must have', 'Data handling obligations are non-negotiable.'],
  'access-retention': ['Must have', 'Access control and retention are auditable obligations.'],
  'system-dependency': ['Should have', 'Dependencies shape design but may resolve during delivery.'],
  'release-constraint': ['Must have', 'Dates, budget, and blackout periods constrain the release.'],
  'technical-reservation': ['Should have', 'Reservations require validation before build, not a feature in themselves.'],
  'threat-scenario': ['Must have', 'Misuse and failure scenarios must be prevented or accepted.'],
  'mitigation-owner': ['Must have', 'A safeguard without an owner will not be verified.'],
  'residual-risk': ['Must have', 'Residual risk needs an explicit acceptance decision.'],
  'priority': ['Must have', 'Records the first capability to deliver.'],
  'trade-off': ["Could have", 'Deferred items are useful but not required for the first release.'],
  'open-decision': ['Should have', 'Tracks the evidence needed to close remaining uncertainty.'],
};
const FORCE_MUST = /\b(regulat|compliance|audit|legal|mandatory|obligation|security|privacy|safety)\b/i;

export function suggestPriority(question, person) {
  const rule = PRIORITY_RULES[question?.key];
  let [value, reason] = rule || ['Should have', 'Default for a supporting requirement; adjust if the business outcome depends on it.'];
  const text = `${question?.question || ''} ${question?.key || ''}`;
  if (FORCE_MUST.test(text) && value !== 'Must have') { value = 'Must have'; reason = 'The question covers a mandatory, regulatory, or protection obligation.'; }
  if (['Security', 'Risk & compliance'].includes(person?.function) && ['data-classification', 'access-retention', 'threat-scenario', 'mitigation-owner', 'residual-risk'].includes(question?.key)) { value = 'Must have'; reason = `Recorded from the ${person.function} perspective, where this is a control obligation.`; }
  return { value, reason, source: 'auto' };
}

export const PRIORITY_RANK = { 'Must have': 3, 'Should have': 2, 'Could have': 1, "Won't have this release": 0 };
export function strongestPriority(values) {
  return values.filter(Boolean).sort((a, b) => (PRIORITY_RANK[b] ?? 0) - (PRIORITY_RANK[a] ?? 0))[0] || 'Should have';
}

export function nextQuestion(e, person) {
  const reopen = person.reopenedQuestions?.find(q => !person.responses.some(r => r.questionId === q.id));
  if (reopen) return { ...reopen, number: person.responses.length + 1, followup: true, prioritySuggestion: suggestPriority(reopen, person) };
  const index = person.responses.length;
  const previous = person.responses.at(-1);
  const phaseIndex = previous ? previous.phaseIndex : 0;
  const phaseResponses = person.responses.filter(r => r.phaseIndex === phaseIndex && !r.followup && !r.reopened);
  const followups = person.responses.filter(r => r.phaseIndex === phaseIndex && r.followup).length;
  let phase = phaseIndex;
  let template;
  let followup = false;
  if (phaseResponses.length < 3) template = PHASES[phase].questions[phaseResponses.length];
  else if (followups < 2 && needsFollowup(previous)) {
    followup = true;
    template = [`${previous.questionKey}-detail`, previous.disposition === 'unknown' ? `Who could confirm “${PHASES[phase].questions[0][1]}” and what evidence should we request?` : 'To make your last answer testable, what baseline, target, exception, or named owner should we record? Please be specific.', [
      'The accountable owner is the operations manager, who can confirm the baseline from the last six weeks of tracker records.',
      'A measurable target is a 15-minute reduction in median handling effort, reviewed weekly for the first quarter.',
      'This needs evidence before we commit; a specialist review with the named owner would close the gap.',
    ]];
  } else {
    phase = phaseIndex + 1;
    if (phase >= PHASES.length) return null;
    template = PHASES[phase].questions[0];
  }
  const roleHint = person.function === 'Technology' ? 'Please include system boundaries or dependencies where relevant.' : person.function === 'Security' ? 'Please distinguish a verified control from a proposed safeguard.' : `Answer from your perspective as ${person.role}; it is fine to identify someone better placed to answer.`;
  const question = { id: `q-${index}`, phaseIndex: phase, phase: PHASES[phase].name, question: template[1], key: template[0], hint: roleHint, suggestions: suggestionSet(template[2], person), followup, number: index + 1, phaseQuestion: person.responses.filter(r => r.phaseIndex === phase).length + 1, engine: 'guided' };
  return { ...question, prioritySuggestion: suggestPriority(question, person) };
}

function suggestionSet(base, person) {
  const specialist = person.function === 'Business' ? 'a specialist' : 'the business owner';
  return [...base, `This is outside my area; ${specialist} should confirm it with evidence before it is treated as a requirement.`, 'I have a different example or constraint to share, and I will describe it below.'].slice(0, 5);
}

export function interviewProgress(person) {
  const answered = person.responses.length;
  const phases = new Set(person.responses.map(r => r.phaseIndex)).size;
  return { answered, phases, percent: person.status === 'completed' ? 100 : Math.min(96, Math.round(phases / 10 * 100)), unknown: person.responses.filter(r => ['unknown', 'skipped'].includes(r.disposition)).length };
}
