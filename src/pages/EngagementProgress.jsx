import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Bell, BellRing, CheckCircle2, ChevronRight, Clock3, Coffee, Pause, RefreshCw, Timer, UserPlus, Users, AlertTriangle, Link2, CalendarDays } from 'lucide-react';
import { api, cx, formatDay, formatTime, inviteUrl, copyText } from '../lib.js';
import { Button, Badge, Progress, Notice, Field, Modal, Avatar, Empty, SectionTitle } from '../components/UI.jsx';

const FUNCTIONS = ['Business', 'Operations', 'Technology', 'Security', 'Risk & compliance', 'Change & adoption', 'Customer / end user', 'Finance'];
const ZONES = ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Pacific/Auckland', 'Asia/Singapore', 'Asia/Kolkata', 'Asia/Tokyo', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'UTC'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_STYLE = { active: ['Participating', 'green'], idle: ['Recently active', 'blue'], paused: ['Paused by stakeholder', 'amber'], 'on-break': ['On a break', 'amber'], 'not-started': ['Not opened yet', 'neutral'], completed: ['Interview complete', 'green'] };

export default function ProgressBoard({ e, notify }) {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(''); const [auto, setAuto] = useState(null);
  const load = useCallback(async () => { try { const result = await api(`/engagements/${e.id}/progress`); setData(result); setError(''); } catch (err) { setError(err.message); } }, [e.id]);
  useEffect(() => { load(); const timer = setInterval(load, 20000); return () => clearInterval(timer); }, [load]);
  const remind = async (stakeholderId, name) => {
    setBusy(stakeholderId);
    try { const current = await api(`/engagements/${e.id}`); await api(`/engagements/${e.id}/reminders/${stakeholderId}`, { method: 'POST', body: { message: '', expectedVersion: current.engagement.revision } }); notify(`Reminder sent to ${name}. It appears in their interview and respects any break they have taken.`); await load(); }
    catch (err) { notify(err.message, 'error'); } finally { setBusy(''); }
  };
  const checkAuto = async () => {
    setBusy('auto');
    try { const result = await api(`/engagements/${e.id}/reminders/auto`, { method: 'POST', body: {} }); setAuto(result.reminders || []); notify(result.reminders?.length ? `${result.reminders.length} reminder${result.reminders.length === 1 ? '' : 's'} sent to stakeholders who are behind.` : 'Every stakeholder is either participating, paused, on a break, or complete. No reminder was needed.'); await load(); }
    catch (err) { notify(err.message, 'error'); } finally { setBusy(''); }
  };
  if (error) return <Notice color="amber">{error} <button className="text-btn" onClick={load}>Retry</button></Notice>;
  if (!data) return <div className="page-skeleton"><div /><div /></div>;
  const { summary, stakeholders, reminderPolicy } = data;
  return <div className="form-stack progress-board">
    <SectionTitle title="Who is where, right now." description="Every stakeholder has their own screen. You see each question as it is answered, who is behind, and who has deliberately paused or taken a break." action={<div className="button-row"><Button variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button><Button icon={BellRing} busy={busy === 'auto'} onClick={checkAuto}>Check who is behind</Button></div>} />
    <div className="progress-summary">
      {[['completed', 'Complete', CheckCircle2, 'green'], ['active', 'Participating', Activity, 'blue'], ['awaitingAnswer', 'Awaiting an answer', Clock3, 'amber'], ['paused', 'Paused / on a break', Coffee, 'purple'], ['behind', 'Behind', AlertTriangle, 'red']].map(([key, label, Icon, color]) => <div className={cx('progress-summary-card', summary[key] > 0 && key === 'behind' && 'attention')} key={key}><span className={`stat-icon ${color}`}><Icon size={17} /></span><strong>{summary[key]}</strong><span>{label}</span></div>)}
    </div>
    <Notice color="blue" icon={BellRing}><strong>Reminders are respectful.</strong> Automatic reminders are skipped while a stakeholder has paused, is on a break, or has finished. Policy: inactive for {reminderPolicy.idleMinutes} minutes, at most {reminderPolicy.maxPerDay} per day, with a {reminderPolicy.cooldownMinutes}-minute cool-down.{auto?.length ? ` ${auto.length} reminder(s) just sent.` : ''}</Notice>
    {stakeholders.map((person, index) => {
      const [label, color] = STATUS_STYLE[person.activity.status] || ['Interviewing', 'blue'];
      return <section className={cx('panel progress-person', person.behind && 'behind')} key={person.stakeholderId}>
        <div className="progress-person-heading"><Avatar name={person.name} index={index} /><div><h3>{person.name}</h3><p>{person.role} · {person.function}</p></div><Badge color={color} dot>{label}</Badge>{person.behind && <Badge color="red">Behind</Badge>}</div>
        <div className="progress-facts">
          <span><Clock3 size={13} />Question {Math.min(30, person.responses + 1)} of up to 30 · phase {person.currentPhase}/10 ({person.currentPhaseName})</span>
          <span><Timer size={13} />{person.timeBudget?.minutes ? `Allowed ${person.timeBudget.minutes} min · ${person.pacing.estimatedMinutesRemaining} min remaining` : 'No time budget given yet'}</span>
          <span><Coffee size={13} />{person.activity.status === 'on-break' && person.activity.until ? `On a break until ${formatTime(person.activity.until)}` : person.idleMinutes === null ? 'Has not opened the link yet' : `Last active ${person.idleMinutes < 1 ? 'just now' : `${person.idleMinutes} min ago`}`}</span>
          <span><Bell size={13} />{person.reminderCount || 0} reminder{person.reminderCount === 1 ? '' : 's'} sent{person.unreadReminders ? ` · ${person.unreadReminders} unread` : ''}</span>
        </div>
        <Progress value={person.percent} />
        <div className="question-matrix" role="list" aria-label={`Question progress for ${person.name}`}>{person.phases.map(phase => <div role="listitem" key={phase.index} className={cx('question-cell', phase.status)} title={`${phase.name}: ${phase.answered} answered, ${phase.followups} follow-up(s)`}><span>{String(phase.index + 1).padStart(2, '0')}</span><i /><small>{phase.answered}/3</small></div>)}</div>
        <div className="progress-person-actions"><span className="fine-print">{person.awaitingAnswer ? 'A question is prepared and waiting for their answer.' : person.activity.status === 'completed' ? 'Confirmed and complete; verification checks may still apply.' : 'Next question is generated when they continue.'}</span><div className="button-row">{person.activity.status !== 'completed' && <Button variant="secondary" icon={Bell} busy={busy === person.stakeholderId} onClick={() => remind(person.stakeholderId, person.name)}>Send reminder</Button>}<span className="fine-print"><CalendarDays size={11} /> {formatDay(person.schedule[0].startUtc, person.schedule[0].timezone)} · {formatTime(person.schedule[0].startUtc, person.schedule[0].timezone)}</span></div></div>
      </section>;
    })}
    {!stakeholders.length && <Empty icon={Users} title="No stakeholders yet">Invite someone to start the conversation.</Empty>}
  </div>;
}

export function InviteStakeholder({ e, notify, onClose, onCreated }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [link, setLink] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', email: '', function: 'Business', timezone: 'Australia/Sydney', days: [1, 2, 3, 4, 5], start: '09:00', end: '16:00', sessionMinutes: e.sessionMinutes || 30 });
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const submit = async () => {
    setBusy(true); setError('');
    try {
      const { days, start, end, ...rest } = form;
      const result = await api(`/engagements/${e.id}/stakeholders`, { method: 'POST', body: { ...rest, sessionMinutes: Number(form.sessionMinutes), availability: days.map(day => ({ day, start, end })), expectedVersion: e.revision } });
      setLink({ ...result.invite, parallel: result.result?.parallel });
      notify(`${result.invite.name} can start their interview now — their sittings run in parallel with everyone else.`);
      onCreated?.();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <Modal title="Invite another stakeholder" subtitle="At any time, without restarting the engagement. Their interview runs in parallel." onClose={onClose} wide>
    <div className="modal-body form-stack">
      {link ? <><Notice icon={Link2}><strong>{link.name} is invited.</strong> Share this private link with them. Existing stakeholders keep their own links, and their answers are unchanged.</Notice><div className="private-invite-link"><code>{inviteUrl(link.token)}</code><div className="button-row"><Button variant="secondary" onClick={async () => { try { await copyText(inviteUrl(link.token)); notify('Link copied.'); } catch (err) { notify(err.message, 'error'); } }}>Copy link</Button><a className="btn btn-primary" href={inviteUrl(link.token)} target="_blank" rel="noreferrer">Open interview <ChevronRight size={15} /></a></div></div><p className="fine-print">Adding a stakeholder archives any prepared verification checks and invalidates review approvals, because the evidence set changes.</p><Button variant="secondary" onClick={onClose}>Close</Button></> : <>
        <Notice color="blue">Their sitting is scheduled inside the availability you enter and can overlap with other stakeholders, so nobody waits for a free BA slot.</Notice>
        <div className="form-grid"><Field label="Full name" required><input required minLength={2} maxLength={100} value={form.name} onChange={event => set('name', event.target.value)} placeholder="e.g. Priya Shah" /></Field><Field label="Role" required><input required minLength={2} maxLength={120} value={form.role} onChange={event => set('role', event.target.value)} placeholder="e.g. Security partner" /></Field></div>
        <div className="form-grid"><Field label="Function"><select value={form.function} onChange={event => set('function', event.target.value)}>{FUNCTIONS.map(value => <option key={value}>{value}</option>)}</select></Field><Field label="Email (optional)" hint="Used only in your records; no email is sent."><input type="email" maxLength={254} value={form.email} onChange={event => set('email', event.target.value)} placeholder="name@organisation.com" /></Field></div>
        <div className="form-grid"><Field label="Timezone"><select value={form.timezone} onChange={event => set('timezone', event.target.value)}>{ZONES.map(zone => <option key={zone}>{zone}</option>)}</select></Field><Field label="Length of each sitting"><select value={form.sessionMinutes} onChange={event => set('sessionMinutes', Number(event.target.value))}>{[15, 30, 45, 60].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></Field></div>
        <div className="field"><span className="field-label">Available days</span><div className="day-buttons">{DAYS.map((day, index) => <button type="button" key={day} aria-pressed={form.days.includes(index)} className={form.days.includes(index) ? 'selected' : ''} onClick={() => set('days', form.days.includes(index) ? form.days.filter(d => d !== index) : [...form.days, index].sort())}>{day}</button>)}</div></div>
        <div className="form-grid"><Field label="Available from"><input type="time" required value={form.start} onChange={event => set('start', event.target.value)} /></Field><Field label="Available until"><input type="time" required value={form.end} onChange={event => set('end', event.target.value)} /></Field></div>
        {error && <Notice color="red">{error}</Notice>}
        <div className="button-row"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={UserPlus} busy={busy} onClick={submit} disabled={!form.name.trim() || !form.role.trim() || !form.days.length}>Invite stakeholder</Button></div>
      </>}
    </div>
  </Modal>;
}
