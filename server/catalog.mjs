import { catalogSchema } from './schema.mjs';
export function repositoryConfig() { return { repository: process.env.CATALOG_REPOSITORY || 'Raheelatta1984/AI-Powered-RequirementGathering', path: process.env.CATALOG_PATH || 'catalog/solutions.json', ref: process.env.CATALOG_REF || 'main' }; }
export async function fetchCatalog(config = repositoryConfig(), fetchImpl = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(config.repository) || config.path.startsWith('/') || config.path.split('/').includes('..')) throw new Error('Invalid catalog repository configuration');
  const url = `https://api.github.com/repos/${config.repository}/contents/${config.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(config.ref)}`;
  const response = await fetchImpl(url, { headers: { Accept: 'application/vnd.github.raw+json', 'User-Agent': 'Clarity-BA-Workspace', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`GitHub catalog returned HTTP ${response.status}. Check the repository, ref, path, and server-side access.`);
  const text = await response.text(); if (text.length > 262144) throw new Error('Catalog exceeds the 256 KB limit');
  const catalog = catalogSchema.parse(JSON.parse(text));
  return { ...catalog, solutions: catalog.solutions.map(s => ({ ...s, origin: 'repository' })) };
}
export function mergeCatalog(current, incoming, repository) {
  const retained = current.filter(s => s.origin === 'local' || s.repository !== repository);
  const ids = new Set(retained.map(s => s.id));
  if (incoming.solutions.some(s => ids.has(s.id))) throw new Error('A local solution conflicts with a repository ID. Use unique IDs.');
  return [...retained, ...incoming.solutions];
}
