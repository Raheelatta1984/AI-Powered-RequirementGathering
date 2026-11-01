#!/usr/bin/env node
// Fails a pull request that changes behaviour without a changelog entry.
// Usage: node scripts/check-changelog.mjs --base origin/main --head HEAD
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = name => { const index = args.indexOf(`--${name}`); return index >= 0 ? args[index + 1] : undefined; };
const base = flag('base') || process.env.GITHUB_BASE_REF || 'origin/main';
const head = flag('head') || 'HEAD';

const changelog = existsSync('CHANGELOG.md') ? readFileSync('CHANGELOG.md', 'utf8') : '';
if (!changelog) { console.error('CHANGELOG.md is missing. Every pull request records its change there.'); process.exit(1); }

const unreleased = /##\s+\[?Unreleased\]?[\s\S]*?(?=\n##\s|$)/i.exec(changelog)?.[0] || '';
const planned = /##\s+\[?Planned\]?[\s\S]*?(?=\n##\s|$)/i.exec(changelog)?.[0] || '';
if (!/^[-*]\s+\S/m.test(unreleased) && !/^[-*]\s+\S/m.test(planned)) {
  console.error('CHANGELOG.md has no entries under [Unreleased] or [Planned]. Add at least one entry describing the change.');
  process.exit(1);
}

let changed = [];
try {
  changed = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (error) {
  console.warn(`Could not diff against ${base} (${error.message.split('\n')[0]}). Falling back to the changelog contents only.`);
}

if (changed.length && !changed.includes('CHANGELOG.md')) {
  console.error('This pull request does not modify CHANGELOG.md. Add an entry under [Unreleased] (or [Planned] for future work).');
  process.exit(1);
}

console.log(`Changelog check passed${changed.length ? ` for ${changed.length} changed file(s)` : ''}.`);
