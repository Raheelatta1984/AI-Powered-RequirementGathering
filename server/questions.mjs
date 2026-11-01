export const PHASES = [
  { name: 'Business context', short: 'Context', purpose: 'Understand the opportunity before discussing a solution.', questions: [
    ['business-driver', 'What is driving this change, and why does it matter now?', ['A current process is creating delays', 'We need to meet a new obligation', 'There is an opportunity to improve customer experience']],
    ['current-process', 'Walk me through how this work happens today, from start to finish.', ['The team receives a request and records it manually', 'Work moves between several teams and tools', 'There is no consistent process today']],
    ['strategic-alignment', 'Which business priority should this support, and who owns that priority?', ['Operational efficiency', 'Customer satisfaction', 'Risk reduction']],
  ] },
  { name: 'Problem & evidence', short: 'Problem', purpose: 'Separate observable problems from assumptions.', questions: [
    ['pain-point', 'Where does the current approach break down for you or your team?', ['We re-enter the same information', 'Approvals take too long', 'People cannot find the latest information']],
    ['problem-evidence', 'What evidence shows the size of the problem? Include a recent example or baseline.', ['I can share a recent example', 'We have a measured baseline', 'This is an observation; we still need evidence']],
    ['do-nothing', 'What happens if we leave this unchanged for the next six months?', ['Cost or effort will increase', 'Customer experience will suffer', 'A compliance or operational risk remains']],
  ] },
  { name: 'People & ownership', short: 'Stakeholders', purpose: 'Identify impacted people and decision rights.', questions: [
    ['impacted-people', 'Who uses this process, and who is affected when it goes wrong?', ['Frontline staff and their managers', 'Customers and support teams', 'Several internal teams']],
    ['decision-owner', 'Who can approve the requirements, and who should be consulted before release?', ['The business owner approves with technical input', 'A cross-functional steering group decides', 'The decision owner still needs confirming']],
    ['adoption-barrier', 'What might make this change difficult for people to adopt?', ['People are comfortable with the current process', 'Training and support will be needed', 'The change affects roles or responsibilities']],
  ] },
  { name: 'Outcomes & measures', short: 'Outcomes', purpose: 'Define measurable success, not just activity.', questions: [
    ['success-metric', 'What measurable outcome would tell us this has succeeded? Please include the baseline and target if known.', ['Reduce processing time from a measured baseline', 'Increase completed requests without extra effort', 'We need to agree the baseline and target']],
    ['measurement-owner', 'How and when will that outcome be measured, and who owns the result?', ['Use an existing operational report', 'Compare results before and after release', 'An outcome owner still needs assigning']],
    ['minimum-value', 'What is the smallest improvement that would still deliver meaningful value?', ['Fix the highest-friction step first', 'Support one team before expanding', 'Deliver the mandatory obligation only']],
  ] },
  { name: 'Scope & boundaries', short: 'Scope', purpose: 'Make exclusions as explicit as inclusions.', questions: [
    ['scope-boundary', 'Which capabilities belong in this release, and which should stay out?', ['Include the core workflow only', 'Include reporting but not system replacement', 'I have a boundary to propose']],
    ['scope-exception', 'Describe an important exception or edge case the solution must handle.', ['An incomplete or duplicate request', 'An urgent or escalated case', 'A request that needs to be reversed']],
    ['scope-parking', 'Is there anything outside the agreed scope that we should park for a later decision?', ['No additional items right now', 'An extra integration for a later release', 'An additional audience or business unit']],
  ] },
  { name: 'Functional needs', short: 'Functional', purpose: 'Capture observable behaviour and business rules.', questions: [
    ['core-workflow', 'What must a user be able to do, and what should happen immediately afterwards?', ['Submit a request and receive a reference', 'Review, approve, or return a request', 'Find the current status and next action']],
    ['business-rules', 'What rules determine who can do what, or when an action is allowed?', ['Access depends on role and ownership', 'Approvals depend on a threshold', 'Certain changes require an audit record']],
    ['acceptance-example', 'Give one concrete example of a correct result, including an input and expected outcome.', ['A valid request reaches the right owner', 'An invalid request gets a useful explanation', 'An authorised user can complete the workflow']],
  ] },
  { name: 'Quality & security', short: 'Non-functional', purpose: 'Elicit measurable service, data, and protection needs.', questions: [
    ['service-level', 'What response time, availability, and capacity does your work actually require?', ['During business hours with agreed support', 'A measured response-time target is needed', 'The service must support peak demand']],
    ['data-classification', 'What information is handled, how sensitive is it, and where must it be stored?', ['Personal or customer information', 'Internal business information only', 'Regulated or restricted information']],
    ['access-retention', 'Who may access or export the information, and how long should it be kept?', ['Only authorised roles, with an audit trail', 'Retention follows an approved policy', 'Access and retention need specialist confirmation']],
  ] },
  { name: 'Technical & delivery constraints', short: 'Constraints', purpose: 'Surface dependencies and technical reservations early.', questions: [
    ['system-dependency', 'Which existing tools, interfaces, or system owners must this work fit with?', ['An existing identity provider', 'A system of record or reporting tool', 'The dependency inventory needs confirming']],
    ['release-constraint', 'What dates, budgets, support limits, or blackout periods constrain the change?', ['There is a fixed business or regulatory date', 'We must use supported technology', 'There are blackout periods to confirm']],
    ['technical-reservation', 'What technical assumption or limitation should the delivery team validate before building?', ['Interface availability and ownership', 'Data quality or migration effort', 'Capacity, licensing, or supportability']],
  ] },
  { name: 'Risks & safeguards', short: 'Risks', purpose: 'Identify threats, consequences, and accountable owners.', questions: [
    ['threat-scenario', 'What misuse, failure, or unintended outcome should we actively prevent?', ['Unauthorised access or data disclosure', 'Incorrect or altered business records', 'Service disruption or loss of data']],
    ['mitigation-owner', 'What safeguard or recovery capability is needed, and who will verify it?', ['Strong authentication and least privilege', 'Tested backup and recovery', 'Monitoring, escalation, and an accountable owner']],
    ['residual-risk', 'Which risk needs an explicit acceptance decision before release?', ['A dependency outside our control', 'A temporary manual workaround', 'A residual security or privacy risk']],
  ] },
  { name: 'Priority & confirmation', short: 'Priorities', purpose: 'Make trade-offs and remaining uncertainty visible.', questions: [
    ['priority', 'If only one capability could be delivered first, which would it be and why? Set its priority below.', ['The mandatory or highest-risk capability', 'The core end-to-end workflow', 'The highest-value measurable improvement']],
    ['trade-off', 'What could be deferred without preventing the main outcome?', ['Additional reporting or convenience features', 'Expansion to more teams', 'Nonessential integrations']],
    ['open-decision', 'What remains uncertain, and what evidence or decision would close that gap?', ['A named owner needs to confirm a decision', 'We need a specialist review', 'No further uncertainty from my perspective']],
  ] },
];
export const PART_PHASES = [[0, 1, 2], [3, 4, 5], [6, 7, 8, 9]];
export const PART_NAMES = ['Discover the need', 'Define the solution', 'Validate & prioritise'];
const vague = /\b(faster|better|easy|secure|soon|improve|user[- ]friendly|efficient|intuitive)\b/i;
export function needsFollowup(response) { return response?.disposition === 'answered' && (response.text.length < 35 || (vague.test(response.text) && !/\d/.test(response.text))); }
export function nextQuestion(e, person) {
  const reopen = person.reopenedQuestions?.find(q => !person.responses.some(r => r.questionId === q.id));
  if (reopen) return { ...reopen, number: person.responses.length + 1, followup: true };
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
    template = [`${previous.questionKey}-detail`, previous.disposition === 'unknown' ? `Who could confirm “${PHASES[phase].questions[0][1]}” and what evidence should we request?` : `To make your last answer testable, what baseline, target, exception, or named owner should we record? Please be specific.`, ['I can provide a measurable target or example', 'A named owner can confirm this', 'This needs evidence before we commit']];
  } else {
    phase = phaseIndex + 1;
    if (phase >= PHASES.length) return null;
    template = PHASES[phase].questions[0];
  }
  const roleHint = person.function === 'Technology' ? 'Please include system boundaries or dependencies where relevant.' : person.function === 'Security' ? 'Please distinguish a verified control from a proposed safeguard.' : `Answer from your perspective as ${person.role}; it is fine to identify someone better placed to answer.`;
  return { id: `q-${index}`, phaseIndex: phase, phase: PHASES[phase].name, question: template[1], key: template[0], hint: roleHint, suggestions: suggestionSet(template[2], person), followup, number: index + 1, phaseQuestion: person.responses.filter(r => r.phaseIndex === phase).length + 1, engine: 'guided' };
}
function suggestionSet(base, person) {
  return [...base, `This is outside my area; ${person.function === 'Business' ? 'a specialist' : 'the business owner'} should confirm`, 'I have a different example or constraint to share'].slice(0, 5);
}
export function interviewProgress(person) {
  const answered = person.responses.length;
  const phases = new Set(person.responses.map(r => r.phaseIndex)).size;
  return { answered, phases, percent: person.status === 'completed' ? 100 : Math.min(96, Math.round(phases / 10 * 100)), unknown: person.responses.filter(r => ['unknown', 'skipped'].includes(r.disposition)).length };
}
