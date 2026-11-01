import React, { useState } from 'react';
import { Bot, LockKeyhole, LogOut, Settings2, ShieldCheck, Sparkles, Users, GitBranch, BellRing, Clock3, Save } from 'lucide-react';
import { Modal, Button, Notice, Badge } from '../components/UI.jsx';
import { api } from '../lib.js';

const ADKAR = [['awareness', 'Awareness'], ['desire', 'Desire'], ['knowledge', 'Knowledge'], ['ability', 'Ability'], ['reinforcement', 'Reinforcement']];
const PHASES = [['prepare', 'Prepare Approach'], ['manage', 'Manage Change'], ['sustain', 'Sustain Outcomes']];
const FALLBACK = {
  changeManagement: { enabled: false, adkar: Object.fromEntries(ADKAR.map(([key]) => [key, true])), phases: Object.fromEntries(PHASES.map(([key]) => [key, true])), changeReview: false },
  reminders: { auto: true, idleMinutes: 20, maxPerDay: 3, cooldownMinutes: 120 },
  interview: { askTimeBudget: true, timeBudgetMinutes: 30, parallelSittings: true },
};

function Switch({ checked, onChange, label, hint }) {
  return <label className="switch-row"><span><strong>{label}</strong>{hint && <small>{hint}</small>}</span><span className={checked ? 'switch on' : 'switch'}><input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} aria-label={label} /><i /></span></label>;
}

export default function WorkspaceSettings({ config, notify, onClose, onSaved }) {
  const [settings, setSettings] = useState(() => ({ ...FALLBACK, ...(config.settings || {}), changeManagement: { ...FALLBACK.changeManagement, ...(config.settings?.changeManagement || {}) }, reminders: { ...FALLBACK.reminders, ...(config.settings?.reminders || {}) }, interview: { ...FALLBACK.interview, ...(config.settings?.interview || {}) } }));
  const [busy, setBusy] = useState(false);
  const cm = settings.changeManagement;
  const setCm = patch => setSettings(s => ({ ...s, changeManagement: { ...s.changeManagement, ...patch } }));
  const setGroup = (group, patch) => setSettings(s => ({ ...s, [group]: { ...s[group], ...patch } }));
  const save = async () => {
    setBusy(true);
    try { const result = await api('/settings', { method: 'PUT', body: settings }); onSaved?.(result.settings); notify('Master setup saved. New engagements use this setup; existing engagements keep their own and can be changed per engagement.'); onClose(); }
    catch (error) { notify(error.message, 'error'); } finally { setBusy(false); }
  };
  return <Modal title="Master setup" subtitle="Everything is optional. Turn on only what this workspace needs." onClose={onClose} wide>
    <div className="modal-body form-stack">
      <Notice icon={ShieldCheck}>{config.demoWorkspace ? 'Local demo workspace: anyone with this preview URL can act as BA lead. Do not enter sensitive or production data.' : 'Passphrase-protected BA workspace. Stakeholders use separate, private interview links.'}</Notice>
      <div className="settings-row"><div><strong>Interview engine</strong><p>{config.aiEnabled ? `Anthropic · ${config.model} — answers are rephrased into detailed statements` : 'Guided framework — answers are rephrased into detailed statements deterministically'}</p></div><Badge color={config.aiEnabled ? 'green' : 'blue'}>{config.aiEnabled ? 'AI enabled' : 'Guided mode'}</Badge></div>
      <div className="settings-row"><div><strong>Persistence</strong><p>Server-side checkpoints in the configured data directory. Export important records and maintain backups.</p></div><LockKeyhole size={20} /></div>

      <section className="panel setup-card">
        <div className="setup-heading"><span className="solution-icon purple"><GitBranch size={19} /></span><div><h3>Change management (Prosci-informed)</h3><p>Optional at this stage. When off, no sponsor, impact, ADKAR, or people-and-adoption review gate applies.</p></div><Badge color={cm.enabled ? 'purple' : 'neutral'}>{cm.enabled ? 'Enabled' : 'Off'}</Badge></div>
        <Switch label="Enable change management" hint="Adds the change plan tab, ADKAR actions, and adoption gates." checked={cm.enabled} onChange={value => setCm({ enabled: value })} />
        {cm.enabled && <div className="setup-options">
          <div className="setup-group"><span className="eyebrow">PROSCI PROCESSES</span>{PHASES.map(([key, label]) => <Switch key={key} label={label} checked={cm.phases[key]} onChange={value => setCm({ phases: { ...cm.phases, [key]: value } })} />)}</div>
          <div className="setup-group"><span className="eyebrow">ADKAR OUTCOMES</span>{ADKAR.map(([key, label]) => <Switch key={key} label={label} checked={cm.adkar[key]} onChange={value => setCm({ adkar: { ...cm.adkar, [key]: value } })} />)}</div>
          <Switch label="Require a people & adoption review" hint="Adds a fourth named review area before the delivery gate unlocks." checked={cm.changeReview} onChange={value => setCm({ changeReview: value })} />
        </div>}
      </section>

      <section className="panel setup-card">
        <div className="setup-heading"><span className="solution-icon blue"><BellRing size={19} /></span><div><h3>Stakeholder reminders</h3><p>Nudge a stakeholder who has stopped answering. Reminders never send while someone has paused or is on a break.</p></div><Badge color={settings.reminders.auto ? 'green' : 'neutral'}>{settings.reminders.auto ? 'Automatic' : 'Manual only'}</Badge></div>
        <Switch label="Send automatic reminders" hint="Based on inactivity, with a cool-down and a daily limit." checked={settings.reminders.auto} onChange={value => setGroup('reminders', { auto: value })} />
        <div className="form-grid three">
          <label className="field"><span className="field-label">Inactive after (minutes)</span><input type="number" min={5} max={240} value={settings.reminders.idleMinutes} onChange={event => setGroup('reminders', { idleMinutes: Number(event.target.value) })} /></label>
          <label className="field"><span className="field-label">Maximum per day</span><input type="number" min={1} max={10} value={settings.reminders.maxPerDay} onChange={event => setGroup('reminders', { maxPerDay: Number(event.target.value) })} /></label>
          <label className="field"><span className="field-label">Cool-down (minutes)</span><input type="number" min={15} max={1440} value={settings.reminders.cooldownMinutes} onChange={event => setGroup('reminders', { cooldownMinutes: Number(event.target.value) })} /></label>
        </div>
      </section>

      <section className="panel setup-card">
        <div className="setup-heading"><span className="solution-icon green"><Clock3 size={19} /></span><div><h3>Interview pacing</h3><p>Ask each stakeholder how much time they have, and invite people into a parallel interview at any time.</p></div><Badge color="blue">Pacing</Badge></div>
        <Switch label="Ask how much time the stakeholder has" hint="Offered at the start of every interview and editable later." checked={settings.interview.askTimeBudget} onChange={value => setGroup('interview', { askTimeBudget: value })} />
        <div className="form-grid">
          <label className="field"><span className="field-label">Suggested time per interview</span><select value={settings.interview.timeBudgetMinutes} onChange={event => setGroup('interview', { timeBudgetMinutes: Number(event.target.value) })}>{[15, 30, 45, 60].map(value => <option key={value} value={value}>{value} minutes</option>)}</select></label>
          <div className="setup-inline"><Users size={18} /><p>New stakeholders can be invited mid-engagement. Their sittings run in parallel with existing interviews so nobody waits for a free slot in the BA's calendar.</p></div>
        </div>
        <Switch label="Allow parallel interview sittings" hint="Stakeholders interview at the same time; the BA reviews progress rather than attending every sitting." checked={settings.interview.parallelSittings} onChange={value => setGroup('interview', { parallelSittings: value })} />
      </section>

      <div className="settings-row"><div><strong>Voice & microphone</strong><p>Optional browser speech features. Audio is not saved by Clarity.</p></div><span className="muted small"><Settings2 size={16} /></span></div>
      <p className="fine-print">This setup applies to new engagements. Each existing engagement keeps its own setup, which the BA can change in the engagement's Change plan tab. AI suggestions are not stakeholder evidence; technical and cyber controls remain proposals until reviewed and tested.</p>
      <div className="button-row"><Button icon={Save} busy={busy} onClick={save}>Save master setup</Button>{config.authRequired && <Button variant="secondary" icon={LogOut} onClick={async () => { await api('/logout', { method: 'POST' }); onClose(); location.reload(); }}>Sign out</Button>}</div>
      <p className="fine-print"><Sparkles size={12} /> Optional processes stay visible as off, so nothing is silently assumed to be complete.</p>
      <p className="fine-print"><Bot size={12} /> See <a href="#/whats-new">What's new</a> for every past, present, and planned change.</p>
    </div>
  </Modal>;
}
