import { readFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { hash, atomicJson } from './ingestion/core.mjs';
import { verifyCatalog } from './collect-candidates.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
export function importRows(catalog, evidence = []) {
  verifyCatalog(catalog);
  const identities = new Set(catalog.candidates.map(row => row.identity));
  if (evidence.some(row => !identities.has(row.resourceIdentity))) throw new Error('Evidence references an unknown catalog identity');
  return catalog.candidates.map(row => ({
    identity: row.identity,
    slug: `${row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 95) || 'tool'}-${row.id.slice(0, 8)}`,
    name: row.name, type: row.type, canonicalUrl: row.canonicalUrl,
    repositoryUrl: row.repositoryUrl, publisher: row.publisher, license: row.license,
    fetchedAt: row.fetchedAt, sources: row.sources, metrics: row.metrics,
    evidence: evidence.filter(item => item.resourceIdentity === row.identity),
    metadata: { ...row.metadata, catalogId: row.id, verification: row.verification, securityReview: row.securityReview },
  }));
}

export async function databaseConfig() {
  let local = {};
  try { local = parse(await readFile(join(root, '.env.local'), 'utf8')); } catch { /* CI uses environment. */ }
  const env = { ...local, ...process.env };
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing server-only Supabase configuration');
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)) throw new Error('Unexpected Supabase project URL');
  return { url: url.replace(/\/$/, ''), key, projectRef: new URL(url).hostname.split('.')[0] };
}

export async function rest(config, path, options = {}) {
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options, signal: AbortSignal.timeout(30000), redirect: 'error',
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase HTTP ${response.status} (${body?.code || 'unknown'}). No schema creation is possible with the Data API key; authenticate the dashboard/CLI to apply the reviewed migration.`);
  return body;
}

async function main() {
  const catalog = JSON.parse(await readFile(join(root, 'data/catalog/candidates.json'), 'utf8'));
  const evidence = JSON.parse(await readFile(join(root, 'data/catalog/community-evidence.json'), 'utf8'));
  const rows = importRows(catalog, evidence.entries);
  const contentHash = hash(JSON.stringify(rows));
  const output = join(root, 'data/catalog');
  await atomicJson(join(output, 'import-payload.json'), { payload: rows, run_key: `windi-${contentHash.slice(0, 24)}`, content_hash: contentHash });
  if (!process.argv.includes('--apply')) {
    console.log(`Prepared 200 normalized rows + sources + metrics + 200 research jobs + ${evidence.entries.length} evidence entries for review. No database write.`); return;
  }
  const config = await databaseConfig();
  const curated = await rest(config, 'resources?select=id&import_metadata->creatorCatalog->>edition=eq.creator-100-v1&limit=1');
  if (curated.length) throw new Error('Creator 100 is active. Legacy 200-row importer is disabled to preserve editorial content.');
  const expectedProject = process.argv[process.argv.indexOf('--project-ref') + 1];
  if (!process.argv.includes('--project-ref') || expectedProject !== config.projectRef) throw new Error('Supply --project-ref matching the intended project before any write');
  const schema = await rest(config, '');
  if (!schema.paths?.['/rpc/import_windi_catalog']) throw new Error('Catalog migration is not deployed. Import stopped before any write.');
  // Preserve pre-import catalog data; this is not a replacement for a full DB/Storage backup.
  const backupDir = join(root, '.backups/windi', new Date().toISOString().replace(/[:.]/g, '-'));
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  await atomicJson(join(backupDir, 'schema.json'), schema);
  for (const table of ['resources', 'resource_sources', 'resource_metric_snapshots', 'resource_evidence_jobs', 'resource_import_runs', 'resource_community_evidence', 'resource_evidence_media']) {
    const all = [];
    for (let offset = 0; ; offset += 1000) {
      const page = await rest(config, `${table}?select=*&order=${table === 'resource_evidence_jobs' ? 'resource_id' : table === 'resource_import_runs' ? 'idempotency_key' : 'id'}.asc&limit=1000&offset=${offset}`);
      all.push(...page); if (page.length < 1000) break;
    }
    await atomicJson(join(backupDir, `${table}.json`), all);
  }
  const result = await rest(config, 'rpc/import_windi_catalog', { method: 'POST', body: JSON.stringify({ payload: rows, run_key: `windi-${contentHash.slice(0, 24)}`, content_hash: contentHash }) });
  const persisted = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(config, `resources?select=id,external_identity,status&order=id.asc&limit=1000&offset=${offset}`);
    persisted.push(...page); if (page.length < 1000) break;
  }
  const matched = rows.filter(row => persisted.some(item => item.external_identity === row.identity));
  if (matched.length !== 200) throw new Error(`Import needs investigation: read-back matched ${matched.length}/200`);
  const report = { projectRef: config.projectRef, checkedAt: new Date().toISOString(), result, matchedCount: matched.length, publishedByImporter: false, preservedLegacyData: true, backupDirectory: backupDir };
  await atomicJson(join(output, 'database-import-report.json'), report);
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
