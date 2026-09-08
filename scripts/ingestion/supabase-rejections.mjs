import { databaseConfig, rest } from '../import-catalog.mjs';
import { repositoryUrl } from './core.mjs';

function rejectionKeys(row) {
  const keys = new Set();
  if (typeof row.external_identity === 'string' && row.external_identity.startsWith('repo:')) {
    keys.add(row.external_identity.toLowerCase());
  }
  for (const url of [row.repository_url, row.canonical_url]) {
    const repository = repositoryUrl(url);
    if (repository) keys.add(`repo:${repository}`);
  }
  return keys;
}

/**
 * @param {{config?: {url:string, key:string}, request?: (config: {url:string, key:string}, path:string) => Promise<unknown[]>}} options
 * Reads editorially rejected repository identities; never writes to Supabase.
 */
export async function loadRejectedRepositoryIdentities({ config, request = rest } = {}) {
  const connection = config || await databaseConfig();
  const rows = await request(
    connection,
    'resources?select=external_identity,canonical_url,repository_url,updated_at&status=eq.REJECTED&order=updated_at.desc&limit=1000',
  );
  if (!Array.isArray(rows)) throw new Error('Supabase rejected-resource response is not an array');
  const identities = new Set();
  for (const row of rows) for (const key of rejectionKeys(row)) identities.add(key);
  return { identities, count: rows.length, fetchedAt: new Date().toISOString() };
}
