import React, { useEffect, useState } from 'react';
import { Sparkles, History, Rocket, CalendarClock, ArrowUpRight, GitMerge, FileText } from 'lucide-react';
import { api, cx } from '../lib.js';
import { Badge, Notice, Empty, SectionTitle, Button } from '../components/UI.jsx';

const STAGES = [
  { id: 'all', label: 'Everything', icon: History },
  { id: 'present', label: 'Present', icon: Sparkles },
  { id: 'future', label: 'Planned', icon: CalendarClock },
  { id: 'past', label: 'Past releases', icon: Rocket },
];
const STAGE_LABEL = { present: ['In progress', 'blue'], future: ['Planned', 'amber'], past: ['Released', 'green'] };

export default function WhatsNew({ onNew }) {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [stage, setStage] = useState('all');
  useEffect(() => { let active = true; api('/changelog').then(result => { if (active) setData(result); }).catch(err => { if (active) setError(err.message); }); return () => { active = false; }; }, []);
  if (error) return <Empty icon={FileText} title="The changelog could not be read" action={<Button onClick={() => location.reload()}>Try again</Button>}>{error}</Empty>;
  if (!data) return <div className="page-skeleton"><div /><div /><div /></div>;
  const releases = data.releases.filter(release => stage === 'all' || release.stage === stage);
  return <div className="page-enter whats-new">
    <div className="page-heading"><div><span className="eyebrow">PAST · PRESENT · PLANNED</span><h1>What's new<span className="heading-dot">.</span></h1><p>Every pull request and merge is recorded here, so the workspace history is never a guess.</p></div><Button onClick={onNew} icon={Sparkles}>New engagement</Button></div>
    <section className="whats-new-hero">
      <div><Badge color="green"><GitMerge size={12} /> CHANGELOG-LED</Badge><h2>Nothing changes silently.</h2><p>This page is generated from <code>CHANGELOG.md</code>. Work in progress sits under <strong>Present</strong>, committed intentions under <strong>Planned</strong>, and shipped releases under <strong>Past</strong>. A CI check fails any pull request that changes behaviour without an entry.</p><div className="whats-new-counts">{[['past', 'Released'], ['present', 'In progress'], ['future', 'Planned'], ['entries', 'Entries']].map(([key, label]) => <div key={key}><strong>{data.counts[key]}</strong><span>{label}</span></div>)}</div></div>
      <div className="changelog-policy"><FileText size={22} /><h3>How an entry is written</h3><p>Describe what a BA lead can now do — not which files changed. Say when something is proposed, optional, or planned rather than delivered.</p><a className="text-btn" href="https://github.com/Raheelatta1984/AI-Powered-RequirementGathering/blob/main/docs/CHANGELOG_POLICY.md" target="_blank" rel="noreferrer">Read the policy <ArrowUpRight size={14} /></a></div>
    </section>
    <div className="filter-tabs whats-new-tabs">{STAGES.map(({ id, label, icon: Icon }) => <button key={id} className={cx(stage === id && 'selected')} onClick={() => setStage(id)}><Icon size={14} />{label}</button>)}</div>
    <div className="release-list">{releases.map((release, index) => <section className="panel release-card" key={`${release.title}-${index}`}>
      <header className="release-heading"><div><span className="eyebrow">{(STAGE_LABEL[release.stage] || ['Recorded', 'neutral'])[0]}</span><h2>{release.version ? `v${release.version}` : release.title.replace(/[[\]]/g, '')}</h2><small>{release.date ? new Date(release.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No release date recorded'}</small></div><Badge color={(STAGE_LABEL[release.stage] || ['Recorded', 'neutral'])[1]}>{release.items} {release.items === 1 ? 'entry' : 'entries'}</Badge></header>
      <div className="release-sections">{release.sections.map(section => <div key={section.title} className="release-section"><h3>{section.title}</h3><ul>{section.items.map((item, i) => <li key={i}>{item.text}</li>)}</ul></div>)}</div>
    </section>)}{!releases.length && <Empty icon={History} title="Nothing recorded for this view">Choose another horizon, or add an entry to CHANGELOG.md.</Empty>}</div>
    <Notice color="blue"><strong>Contributors:</strong> {data.policy}</Notice>
  </div>;
}
