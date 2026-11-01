// Every answered response is elicited and rephrased into a detailed, testable statement.
// The original wording is always retained; the detailed version is an explicit expansion that
// names the gaps instead of inventing facts, measures, owners, or evidence.
const VAGUE = /\b(faster|better|easier|easy|secure|soon|improve|improved|user[- ]friendly|efficient|intuitive|robust|seamless)\b/gi;
const OWNER = /\b(owner|owns|owned|accountable|responsible|approver|approved by|decision maker|director|manager|lead)\b/i;
const EVIDENCE = /\b(example|for instance|e\.g\.|recent|last week|last month|sample|record|report|baseline|measured|extract|log)\b/i;
const MEASURE = /\d/;

const tidy = value => String(value || '').replace(/\s+/g, ' ').trim();
const sentence = value => (/[.!?]$/.test(value) ? value : `${value}.`);
const capitalise = value => value.charAt(0).toUpperCase() + value.slice(1);

export function elaborationGaps(answer) {
  const text = tidy(answer);
  const gaps = [];
  if (!MEASURE.test(text)) gaps.push('No measurable baseline or target was supplied; the BA or an accountable owner must confirm one.');
  if (!OWNER.test(text)) gaps.push('The accountable decision owner is not named.');
  if (!EVIDENCE.test(text)) gaps.push('No concrete example, record, or evidence source was supplied.');
  const vague = [...new Set((text.match(VAGUE) || []).map(term => term.toLowerCase()))];
  if (vague.length) gaps.push(`Terms that need a measurable definition: ${vague.join(', ')}.`);
  return gaps;
}

export function elaborateGuided({ question, answer, phase, person, priority }) {
  const text = tidy(answer);
  if (!text) return { text: '', gaps: [], engine: 'guided' };
  const gaps = elaborationGaps(text);
  const focus = tidy(question).replace(/\?$/, '');
  const lines = [
    `${person.function} requirement — ${focus}.`,
    `Reported position: ${sentence(text)}`,
    `Requirement implication: the agreed solution must support this position from the ${person.function.toLowerCase()} perspective${priority ? `, currently prioritised as “${priority}”` : ''}. ${phase?.purpose || 'The BA will reconcile this statement with the other stakeholder perspectives.'}`,
    gaps.length
      ? `Still to confirm before build: ${gaps.join(' ')}`
      : 'This statement is specific enough to be tested. The BA will still reconcile it with the other stakeholder perspectives and the review gates.',
  ];
  return { text: lines.join('\n\n'), gaps, engine: 'guided' };
}

export function sameDigits(source, candidate) {
  const allowed = new Set(tidy(source).match(/\d+/g) || []);
  return (tidy(candidate).match(/\d+/g) || []).every(value => allowed.has(value));
}

export function elaborateResponseText(phaseName, purpose) {
  return capitalise(`${phaseName}: ${purpose}`);
}
