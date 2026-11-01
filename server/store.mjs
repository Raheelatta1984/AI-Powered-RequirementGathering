import { mkdir, readFile, writeFile, rename, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { catalogSchema } from './schema.mjs';
import { AppError } from './domain.mjs';

export async function createStore(dataDir = process.env.DATA_DIR || './data', seed) {
  const dir = resolve(dataDir); await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = join(dir, 'workspace.json');
  let state;
  try { const parsed = JSON.parse(await readFile(file, 'utf8')); if (parsed.schemaVersion !== 12 || !Array.isArray(parsed.engagements)) throw new Error('Unsupported workspace schema'); state = parsed; }
  catch (error) { if (error.code !== 'ENOENT') throw new Error(`Cannot load ${file}: ${error.message}. Restore a valid backup; the existing file has not been overwritten.`); }
  if (!state) {
    const registry = catalogSchema.parse(JSON.parse(await readFile(resolve('catalog/solutions.json'), 'utf8')));
    state = { schemaVersion: 12, secret: randomBytes(32).toString('hex'), engagements: [], catalog: registry.solutions.map(s => ({ ...s, origin: 'repository' })), catalogMeta: { source: 'catalog/solutions.json', syncedAt: null }, notices: [] };
    if (seed) state.engagements = seed(state.catalog);
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
    get: id => structuredClone(state.engagements.find(e => e.id === id)),
    create: e => transaction(draft => { draft.engagements.unshift(e); return e; }),
    update(id, fn) { return transaction(draft => { const e = draft.engagements.find(item => item.id === id); if (!e) throw new AppError('Engagement not found', 404); const result = fn(e); e.revision += 1; return { engagement: e, result }; }); },
    remove: id => transaction(draft => { const e = draft.engagements.find(item => item.id === id); if (!e) throw new AppError('Engagement not found', 404); if (!e.isExample && (e.stakeholders.some(p => p.responses.length) || e.artifacts.length)) throw new AppError('Started engagements are retained for audit. Create a new engagement for a new change.', 409); draft.engagements = draft.engagements.filter(item => item.id !== id); return true; }),
    catalog: solutions => transaction(draft => { draft.catalog = solutions; draft.catalogMeta = { source: 'Repository / local registry', syncedAt: new Date().toISOString() }; return draft.catalog; }),
  };
}
