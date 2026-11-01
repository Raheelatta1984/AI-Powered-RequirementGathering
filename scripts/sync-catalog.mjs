import { writeFile } from 'node:fs/promises';
import { fetchCatalog, repositoryConfig } from '../server/catalog.mjs';
const config = repositoryConfig();
const catalog = await fetchCatalog(config);
await writeFile('catalog/solutions.json', JSON.stringify({ schemaVersion: 1, description: catalog.description || 'Repository-backed solution inventory', solutions: catalog.solutions.map(({ origin, ...s }) => s) }, null, 2) + '\n');
console.log(`Synced ${catalog.solutions.length} solutions from ${config.repository}@${config.ref}:${config.path}`);
