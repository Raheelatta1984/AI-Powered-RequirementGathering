import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { catalogSchema, workspaceSettingsInput } from './schema.mjs';
import { AppError } from './domain.mjs';
import { defaultWorkspaceSettings, legacyChangeManagement } from './settings.mjs';

export const SCHEMA_VERSION = 13;

// A workspace written by an earlier release is migrated in place, never discarded.
export function migrateState(state) {
  if (state.schemaVersion === SCHEMA_VERSION) return { state, migrated: false };
  if (state.schemaVersion !== 12) throw new Error('Unsupported workspace schema');
  const next = state;
  next.schemaVersion = SCHEMA_VERSION;
  next.settings = workspaceSettingsInput.parse(next.settings || defaultWorkspaceSettings());
  for (const e of next.engagements) {
    // Records reviewed before optional change management keep the gates they were approved under.
    e.changeManagement ||= legacyChangeManagement();
    e.interviewSettings ||= { askTimeBudget: true, timeBudgetMinutes: e.sessionMinutes || 30, parallelSittings: true };
    for (const person of e.stakeholders) {
      person.timeBudget ??= null; person.startedAt ??= person.responses?.[0]?.at || null;
      person.lastSeenAt ??= person.responses?.at(-1)?.at || person.completedAt || null;
      person.reminders ||= [];
      person.activity ||= { status: person.status === 'completed' ? 'completed' : 'not-started', note: '', updatedAt: null, breakUntil: null };
      for (const response of person.responses || []) { response.detail ||= ''; response.detailGaps ||= []; response.detailEngine ||= 'none'; response.prioritySource ||= 'stakeholder'; }
    }
    e.changePlan ||= { sponsor: '', impact: '', adkar: {} };
  }
  return { state: next, migrated: true };
}

export async function createStore(dataDir = process.env.DATA_DIR || './data', seed) {
  const dir = resolve(dataDir); await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, 'workspace.json');
  let state;
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    if (!Array.isArray(parsed.engagements)) throw new Error('Unsupported workspace schema');
    const migrated = migrateState(parsed);
    state = migrated.state;
    if (migrated.migrated) await persist(state);
  }
  catch (error) { if (error.code !== 'ENOENT') throw new Error(`Cannot load ${file}: ${error.message}. Restore a valid backup; the existing file has not been overwritten.`); }
  if (!state) {
    const registry = catalogSchema.parse(JSON.parse(await readFile(resolve('catalog/solutions.json'), 'utf8')));
    state = {
      schemaVersion: SCHEMA_VERSION, secret: randomBytes(32).toString('hex'), engagements: [],
      catalog: registry.solutions.map(s => ({ ...s, origin: 'repository' })),
      catalogMeta: { source: 'catalog/solutions.json', syncedAt: null }, notices: [],
      settings: defaultWorkspaceSettings(),
    };
    if (seed) state.engagements = seed(state.catalog, state.settings);
    await persist(state);
  }
  let queue = Promise.resolve();
  async function persist(snapshot) {
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(snapshot, null, 2), { mode: 0o600 }); await chmod(temp, 0o600); await rename(temp, file);
  }
  function transaction(fn) {
    const work = queue.then(async () => { const draft = structuredClone(state); const result = await fn(draft); await persist(draft); state = draft; return structuredClone(result); });
    queue = work.catch(() => {}); return work;
  }
  return {
    snapshot: () => structuredClone(state),
    settings: () => structuredClone(state.settings || defaultWorkspaceSettings()),
    get: id => structuredClone(state.engagements.find(e => e.id === id)),
    create: e => transaction(draft => { draft.engagements.unshift(e); return e; }),
    update(id, fn) { return transaction(draft => { const e = draft.engagements.find(item => item.id === id); if (!e) throw new AppError('Engagement not found', 404); const result = fn(e); e.revision += 1; return { engagement: e, result }; }); },
    // Mutations that record presence (heartbeats, break state) must not change the record revision.
    mutate(id, fn) { return transaction(draft => { const e = draft.engagements.find(item => item.id === id); if (!e) throw new AppError('Engagement not found', 404); const result = fn(e); e.updatedAt = new Date().toISOString(); return { engagement: e, result }; }); },
    remove: id => transaction(draft => { const e = draft.engagements.find(item => item.id === id); if (!e) throw new AppError('Engagement not found', 404); if (!e.isExample && (e.stakeholders.some(p => p.responses.length) || e.artifacts.length)) throw new AppError('Started engagements are retained for audit. Create a new engagement for a new change.', 409); draft.engagements = draft.engagements.filter(item => item.id !== id); return true; }),
    catalog: solutions => transaction(draft => { draft.catalog = solutions; draft.catalogMeta = { source: 'Repository / local registry', syncedAt: new Date().toISOString() }; return draft.catalog; }),
    saveSettings: settings => transaction(draft => { draft.settings = settings; return draft.settings; }),
    sweepReminders: fn => transaction(draft => fn(draft)),
    markNotificationsRead: fn => transaction(draft => fn(draft)),
  };
}
