import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../server/store.mjs';
import { createApp } from '../server/app.mjs';
import { fetchCatalog, mergeCatalog } from '../server/catalog.mjs';

const availability = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, start: '08:00', end: '18:00' }));
const roster = [{ name: 'Alex Morgan', role: 'Senior BA', function: 'Business', email: '', timezone: 'Australia/Sydney', availability }];
const payload = () => ({ title: 'API test engagement', problem: 'A clear problem statement for the API test.', owner: 'Alex Morgan', type: 'new', scopeIn: 'Core workflow', startDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), sessionMinutes: 30, stakeholders: roster });
async function fixture(t, auth = '') { const dir = await mkdtemp(join(tmpdir(), 'clarity-test-')); const store = await createStore(dir); const app = createApp(store, { accessToken: auth }); const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); }); const base = `http://127.0.0.1:${server.address().port}`; t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(dir, { recursive: true, force: true }); }); const call = async (path, body, method, headers = {}) => { const response = await fetch(`${base}/api${path}`, { method: method || (body ? 'POST' : 'GET'), headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }); const type = response.headers.get('content-type'); return { status: response.status, body: type?.includes('json') ? await response.json() : await response.text(), headers: response.headers }; }; return { store, call, base, dir };
}

test('complete HTTP workflow enforces isolation, gates, checkpoints, and a downloadable MD', async t => {
  const { call, store, dir } = await fixture(t);
  const created = await call('/engagements', payload()); assert.equal(created.status, 201); const e = created.body.engagement; const token = created.body.invites[0].token; assert.equal(token.length, 43); assert.ok(!JSON.stringify(e).includes('tokenHash')); assert.ok(!JSON.stringify(e).includes(token));
  const blocked = await call(`/engagements/${e.id}/generate`, { expectedVersion: e.revision, attestation: true }); assert.equal(blocked.status, 409); assert.match(blocked.body.error, /not complete/);
  let view = (await call(`/interviews/${token}`)).body; assert.ok(!JSON.stringify(view).includes('tokenHash')); assert.ok(!('stakeholders' in view.engagement));
  let count = 0;
  while (view.person.status !== 'completed' && count < 60) {
    const next = await call(`/interviews/${token}/next`, { continueEarly: true }); assert.equal(next.status, 200); view = next.body;
    if (view.completionReady) { const complete = await call(`/interviews/${token}/complete`, { expectedVersion: view.engagement.revision, confirmed: true }); assert.equal(complete.status, 200); assert.ok(!('engagement' in complete.body)); break; }
    const answer = await call(`/interviews/${token}/answer`, { questionId: view.question.id, text: 'The accountable owner will validate a baseline of 40 minutes and a target of 25 minutes using recent records.', disposition: 'answered', priority: 'Should have', expectedVersion: view.engagement.revision }); assert.equal(answer.status, 200); assert.ok(!('stakeholders' in answer.body)); assert.ok(!JSON.stringify(answer.body).includes(token)); view = answer.body.interview; count++;
  }
  view = (await call(`/interviews/${token}`)).body; assert.equal(view.person.status, 'completed'); assert.ok(view.checks.length >= 2); assert.ok(view.checks.every(c => c.singleSource));
  const late = await call(`/interviews/${token}/answer`, { questionId: 'q-0', text: 'Late answer', expectedVersion: view.engagement.revision }); assert.equal(late.status, 409);
  for (const check of view.checks) { let current = (await call(`/engagements/${e.id}`)).body.engagement; const answered = await call(`/interviews/${token}/verifications/${check.id}`, { text: 'Verified with the named owner; independent specialist review remains required.', expectedVersion: current.revision }); assert.equal(answered.status, 200); current = (await call(`/engagements/${e.id}`)).body.engagement; const resolved = await call(`/engagements/${e.id}/verifications/${check.id}/resolve`, { resolution: 'BA records the verified position and the single-source limitation.', expectedVersion: current.revision }); assert.equal(resolved.status, 200); }
  let current = (await call(`/engagements/${e.id}`)).body.engagement;
  const adkar = Object.fromEntries(['awareness', 'desire', 'knowledge', 'ability', 'reinforcement'].map(k => [k, { action: `Action for ${k}`, owner: 'Alex Morgan', measure: `Review ${k} evidence` }]));
  const plan = await call(`/engagements/${e.id}/change-plan`, { sponsor: 'Alex Morgan', impact: 'The operations team changes its workflow.', adkar, expectedVersion: current.revision }, 'PUT'); assert.equal(plan.status, 200); current = plan.body.engagement;
  for (const area of ['business', 'technical', 'security', 'change']) { const review = await call(`/engagements/${e.id}/reviews`, { area, reviewer: 'Named Reviewer', role: `${area} specialist`, decision: 'approved', notes: 'Evidence reviewed; proposed controls still require testing.', expectedVersion: current.revision }); assert.equal(review.status, 200); current = review.body.engagement; }
  assert.deepEqual(current.gateReasons, []); const generated = await call(`/engagements/${e.id}/generate`, { expectedVersion: current.revision, attestation: true }); assert.equal(generated.status, 201); const artifact = generated.body.result; assert.match(artifact.content, /Cyber threat precautions/); assert.match(artifact.content, /Single-source limitation/); assert.equal(artifact.sha256.length, 64);
  const downloaded = await call(`/engagements/${e.id}/artifacts/${artifact.id}`); assert.equal(downloaded.status, 200); assert.equal(downloaded.body, artifact.content); assert.match(downloaded.headers.get('content-disposition'), /attachment/);
  const locked = await call(`/engagements/${e.id}/reviews`, { area: 'business', reviewer: 'Late Reviewer', role: 'BA', decision: 'approved', notes: 'This should not overwrite a locked handoff.', expectedVersion: generated.body.engagement.revision }); assert.equal(locked.status, 409);
  const restarted = await createStore(dir); assert.equal(restarted.get(e.id).artifacts[0].content, artifact.content); assert.equal(restarted.get(e.id).status, 'delivered');
});
test('private invite rotation, evidence limits, CSRF, and lead authentication', async t => {
  const { call } = await fixture(t, 'a-test-passphrase-with-sufficient-length');
  assert.equal((await call('/engagements')).status, 401);
  const login = await call('/auth', { token: 'a-test-passphrase-with-sufficient-length' }); assert.equal(login.status, 200); const cookie = login.headers.get('set-cookie').split(';')[0]; assert.match(login.headers.get('set-cookie'), /HttpOnly/); assert.match(login.headers.get('set-cookie'), /SameSite=Strict/);
  const headers = { Cookie: cookie }; const created = await call('/engagements', payload(), null, headers); assert.equal(created.status, 201); const e = created.body.engagement; const token = created.body.invites[0].token;
  assert.equal((await call(`/interviews/${token}`)).status, 200);
  const rotated = await call(`/engagements/${e.id}/invites/${e.stakeholders[0].id}`, { expectedVersion: e.revision }, null, headers); assert.equal(rotated.status, 200); assert.notEqual(rotated.body.token, token); assert.equal((await call(`/interviews/${token}`)).status, 404); assert.equal((await call(`/interviews/${rotated.body.token}`)).status, 200);
  const csrf = await call('/engagements', payload(), null, { ...headers, Origin: 'https://untrusted.example' }); assert.equal(csrf.status, 403);
  const evidence = await call(`/interviews/${rotated.body.token}/evidence`, { filename: 'note.md', text: 'A supporting evidence note.', expectedVersion: rotated.body.engagement.revision }); assert.equal(evidence.status, 201); assert.ok(!('stakeholders' in evidence.body)); assert.equal(evidence.body.attachment.sha256.length, 64);
  const executable = await call(`/interviews/${rotated.body.token}/evidence`, { filename: 'payload.html', text: '<script>alert(1)</script>', expectedVersion: evidence.body.revision }); assert.equal(executable.status, 400);
});
test('existing changes require a real catalog entry and preserve its baseline snapshot', async t => {
  const { call, store } = await fixture(t); const solution = { id: 'actual-tool', name: 'Actual tool', category: 'Operations', version: '2.1', owner: 'Tool owner', status: 'In service', description: 'A verified deployed tool.', repository: 'owner/repository', sourcePath: 'docs/tool.md', systems: ['CRM'], tags: [] };
  assert.equal((await call('/catalog', solution)).status, 201);
  const missing = await call('/engagements', { ...payload(), type: 'existing' }); assert.equal(missing.status, 400);
  const created = await call('/engagements', { ...payload(), type: 'existing', solutionId: solution.id, baseline: 'Current version 2.1 uses manual approval.', desiredChange: 'Automate approval routing.' }); assert.equal(created.status, 201); assert.equal(created.body.engagement.solutionSnapshot.version, '2.1');
  await store.catalog([]); const retained = await call(`/engagements/${created.body.engagement.id}`); assert.equal(retained.body.engagement.solutionSnapshot.name, 'Actual tool');
});
test('repository sync uses only configured GitHub source and validates before merging', async t => {
  let requested; const solution = { id: 'remote-tool', name: 'Remote tool', category: 'Operations', version: '1', owner: 'Owner', status: 'In service', description: 'A tool in service.', repository: 'owner/repo', sourcePath: 'catalog/tool.md', systems: [], tags: [] };
  const previousToken = process.env.GITHUB_TOKEN; delete process.env.GITHUB_TOKEN; t.after(() => { if (previousToken !== undefined) process.env.GITHUB_TOKEN = previousToken; });
  const catalog = await fetchCatalog({ repository: 'owner/repo', path: 'catalog/solutions.json', ref: 'main' }, async (url, options) => { requested = url; assert.equal(options.headers.Authorization, undefined); return { ok: true, text: async () => JSON.stringify({ schemaVersion: 1, solutions: [solution] }) }; }); assert.match(requested, /^https:\/\/api.github.com\/repos\/owner\/repo\/contents\//); assert.equal(catalog.solutions[0].origin, 'repository');
  const merged = mergeCatalog([{ ...solution, id: 'local', origin: 'local' }], catalog, 'owner/repo'); assert.equal(merged.length, 2); assert.throws(() => mergeCatalog([{ ...solution, id: 'remote-tool', origin: 'local' }], catalog, 'owner/repo'), /conflicts/);
  await assert.rejects(() => fetchCatalog({ repository: 'owner/repo', path: '../secrets', ref: 'main' }), /Invalid catalog/);
});
