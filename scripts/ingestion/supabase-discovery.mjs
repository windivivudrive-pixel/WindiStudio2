import { databaseConfig, rest } from '../import-catalog.mjs';
import { hash, repositoryUrl, safeUrl } from './core.mjs';

function identityFor(row) {
  const repository = repositoryUrl(row.repository_url || row.canonical_url);
  return repository ? `repo:${repository}` : String(row.external_identity || '').toLowerCase();
}

async function loadAllPages(connection, path, request, pageSize = 1000) {
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await request(connection, `${path}&limit=${pageSize}&offset=${offset}`);
    if (!Array.isArray(page)) throw new Error('Invalid paginated Supabase response');
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

/**
 * @param {{config?: {url:string, key:string}, request?: (config:any, path:string, options?:object) => Promise<any>}} options
 */
export async function loadDiscoveryDatabaseState({ config, request = rest } = {}) {
  const connection = config || await databaseConfig();
  const [resources, observations] = await Promise.all([
    loadAllPages(connection, 'resources?select=external_identity,canonical_url,repository_url,status,import_metadata&order=created_at.asc,id.asc', request),
    loadAllPages(connection, 'repo_discovery_observations?select=external_identity,github_stars,observed_at&order=observed_at.desc,id.desc', request),
  ]);
  if (!Array.isArray(resources) || !Array.isArray(observations)) throw new Error('Invalid Supabase discovery state');
  const allIdentities = new Set(); const rejectedIdentities = new Set(); const previousStars = new Map();
  for (const row of resources) {
    const identity = identityFor(row);
    if (!identity.startsWith('repo:')) continue;
    allIdentities.add(identity);
    if (row.status === 'REJECTED') rejectedIdentities.add(identity);
  }
  for (const row of observations) if (!previousStars.has(row.external_identity)) previousStars.set(row.external_identity, row);
  return { config: connection, resources, allIdentities, rejectedIdentities, previousStars, fetchedAt: new Date().toISOString() };
}

export function buildDiscoveryPayload(run, selected, now = Date.now()) {
  const observations = run.candidates.map(row => ({
    identity: row.identity, canonicalUrl: row.canonicalUrl, stars: row.metadata.stars,
    fitScore: row.fit.score, needs: row.fit.needs, pushedAt: row.metadata.pushedAt,
    observedAt: row.readme?.observedAt || run.generatedAt,
  }));
  const candidates = selected.map(row => ({
    identity: row.identity, canonicalUrl: row.canonicalUrl, name: row.name,
    tagline: `Ứng viên mới cho ${row.ranking.primaryNeed}; đang chờ biên tập viên kiểm tra.`,
    description: row.metadata.description || row.fit.reasons.join(' '),
    longDescription: `Được chọn tự động từ lượt crawl 6 giờ với điểm sơ bộ ${row.ranking.total}/100. Cần dùng thử trước khi xuất bản. ${row.fit.firstTask || ''}`.trim(),
    documentationUrl: row.readme?.url || '', homepageUrl: safeUrl(row.metadata.homepage) || '',
    license: row.metadata.license || '', stars: row.metadata.stars, pushedAt: row.metadata.pushedAt,
    observedAt: row.readme?.observedAt || run.generatedAt, needs: row.fit.needs,
    access: row.fit.access, flags: row.fit.flags, sources: row.sources,
    readme: row.readme, ranking: row.ranking,
  }));
  const bucketDate = new Date(now);
  const bucket = `${bucketDate.toISOString().slice(0, 10).replaceAll('-', '')}${String(Math.floor(bucketDate.getUTCHours() / 6) * 6).padStart(2, '0')}`;
  const contentHash = hash(JSON.stringify({ observations, candidates }));
  return { observations, candidates, runKey: `windi-repo-${bucket}-${contentHash.slice(0, 16)}`, contentHash };
}

/**
 * @param {any} payload
 * @param {{config?: {url:string, key:string}, request?: (config:any, path:string, options?:object) => Promise<any>}} options
 */
export async function enqueueDiscoveryRun(payload, { config, request = rest } = {}) {
  const connection = config || await databaseConfig();
  return request(connection, 'rpc/import_windi_repo_discovery', {
    method: 'POST',
    body: JSON.stringify({ p_observations: payload.observations, p_selected: payload.candidates, p_run_key: payload.runKey, p_content_hash: payload.contentHash }),
  });
}
