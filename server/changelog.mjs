import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SECTION_ORDER = ['Added', 'Changed', 'Fixed', 'Removed', 'Security', 'Deprecated'];
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// The "What's new" tab is generated from CHANGELOG.md, the single record every pull request and
// merge must update — including entries for work that is planned but not yet released.
export function parseChangelog(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const releases = [];
  let release = null, section = null;
  const pushSection = () => {
    if (!release || !section) return;
    section = null;
  };
  for (const line of lines) {
    const heading = /^##\s+(.+)$/.exec(line);
    if (heading) {
      pushSection();
      const title = heading[1].trim();
      const plain = title.replace(/[[\]]/g, '').trim();
      const tagMatch = /^(unreleased|planned|upcoming|next)/i.exec(plain);
      const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(title);
      const versionMatch = /^v?(\d+\.\d+\.\d+)/.exec(plain);
      release = {
        title,
        version: versionMatch ? versionMatch[1] : null,
        date: dateMatch ? dateMatch[1] : null,
        stage: tagMatch ? (tagMatch[1].toLowerCase() === 'unreleased' ? 'present' : 'future') : 'past',
        sections: [], items: 0,
      };
      releases.push(release);
      continue;
    }
    const sub = /^###\s+(.+)$/.exec(line);
    if (sub && release) { section = { title: sub[1].trim(), items: [] }; release.sections.push(section); continue; }
    const item = /^[-*]\s+(.+)$/.exec(line);
    if (item && release) {
      if (!section) { section = { title: 'Changed', items: [] }; release.sections.push(section); }
      section.items.push({ text: item[1].replace(/\s+/g, ' ').trim(), html: escapeHtml(item[1].replace(/\s+/g, ' ').trim()) });
      release.items += 1;
    }
  }
  const clean = releases.filter(release => release.items > 0 || release.stage !== 'past');
  for (const release of clean) release.sections = release.sections.filter(s => s.items.length).sort((a, b) => SECTION_ORDER.indexOf(a.title) - SECTION_ORDER.indexOf(b.title));
  return {
    releases: clean,
    counts: {
      past: clean.filter(r => r.stage === 'past').length,
      present: clean.filter(r => r.stage === 'present').length,
      future: clean.filter(r => r.stage === 'future').length,
      entries: clean.reduce((total, r) => total + r.items, 0),
    },
    policy: 'Every pull request and merge updates CHANGELOG.md — including plans for work that has not been released yet. See docs/CHANGELOG_POLICY.md.',
  };
}

export function readChangelog(path = resolve('CHANGELOG.md')) {
  try { return parseChangelog(readFileSync(path, 'utf8')); }
  catch { return { releases: [], counts: { past: 0, present: 0, future: 0, entries: 0 }, policy: 'CHANGELOG.md could not be read in this environment.' }; }
}
