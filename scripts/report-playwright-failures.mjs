#!/usr/bin/env node
// Turns a failed Playwright run into GitHub Actions annotations, so the failing assertion is
// visible in the pull request checks without downloading the trace artifact.
import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2] || 'test-results/report.json';
if (!existsSync(file)) { console.log('::error::Browser tests failed and no JSON report was produced. Check the browser install step.'); process.exit(1); }

const report = JSON.parse(readFileSync(file, 'utf8'));
const failures = [];
const walk = (suite, path = []) => {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      for (const result of test.results || []) {
        if (result.status !== 'failed' && result.status !== 'timedOut') continue;
        const errors = (result.errors || []).map(error => (error.message || error.value || '').replace(/\u001b\[[0-9;]*m/g, '').replace(/^.*?Error: /s, 'Error: ')).join(' ');
        failures.push({ title: [...path, spec.title].join(' › '), message: errors.replace(/\s+/g, ' ').slice(0, 900) });
      }
    }
  }
  for (const child of suite.suites || []) walk(child, [...path, child.title]);
};
for (const suite of report.suites || []) walk(suite);

if (!failures.length) { console.log('::error::Browser tests failed without a recorded assertion. Re-run with --reporter=list for details.'); process.exit(1); }
for (const failure of failures) console.log(`::error file=tests/browser/workspace.spec.js,title=${failure.title.replace(/,/g, ';')}::${failure.message.replace(/%/g, '%25').replace(/\r/g, ' ').replace(/\n/g, ' ')}`);
console.log(`::error::${failures.length} browser test(s) failed: ${failures.map(f => f.title).join('; ')}`);
