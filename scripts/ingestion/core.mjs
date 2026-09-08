import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const SOURCE_ORDER = ['skills_sh', 'awesome_agent_skills', 'trendshift', 'mcp_registry', 'github_search'];
const HOSTS = new Set(['skills.sh', 'www.skills.sh', 'raw.githubusercontent.com', 'trendshift.io', 'www.trendshift.io', 'registry.modelcontextprotocol.io', 'api.github.com']);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const cleanText = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);

export function safeUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(url.hostname)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
    return url.toString().replace(/\/$/, '');
  } catch { return null; }
}

export function repositoryUrl(input) {
  const safe = safeUrl(input);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.hostname !== 'github.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || !parts.slice(0, 2).every(p => /^[\w.-]+$/.test(p))) return null;
  return `https://github.com/${parts[0]}/${parts[1].replace(/\.git$/i, '')}`.toLowerCase();
}

// A skill is a sub-resource. Do not collapse distinct skills in a monorepo.
export function identity(candidate) {
  const repo = repositoryUrl(candidate.repositoryUrl);
  if (candidate.type === 'SKILL') return `skill:${repo || safeUrl(candidate.canonicalUrl)}:${candidate.skillId?.toLowerCase() || candidate.name.toLowerCase()}`;
  return repo ? `repo:${repo}` : `url:${safeUrl(candidate.canonicalUrl)}`;
}

export function mergeCandidates(rows) {
  const result = new Map();
  for (const row of rows) {
    if (!safeUrl(row.canonicalUrl) || !row.name || !SOURCE_ORDER.includes(row.source)) continue;
    const key = identity(row);
    const evidence = { source: row.source, sourceUrl: row.sourceUrl, listingUrl: row.listingUrl, sourceId: row.sourceId, fetchedAt: row.fetchedAt, metadata: row.metadata || {} };
    const existing = result.get(key);
    if (existing) {
      if (!existing.sources.some(s => s.source === evidence.source && s.sourceId === evidence.sourceId)) existing.sources.push(evidence);
      if (row.type === 'MCP') existing.type = 'MCP';
      if (row.license && !existing.license) existing.license = row.license;
      existing.metrics.push(...(row.metrics || []));
      continue;
    }
    result.set(key, {
      id: hash(key).slice(0, 24), identity: key, name: cleanText(row.name), type: row.type,
      canonicalUrl: safeUrl(row.canonicalUrl), repositoryUrl: repositoryUrl(row.repositoryUrl),
      skillId: row.skillId ?? null, publisher: row.publisher || null,
      source: row.source, sources: [evidence], metadata: row.metadata || {}, metrics: row.metrics || [],
      status: 'CANDIDATE', windiScore: null, editorialBadges: [],
      verification: 'source_listing_only', securityReview: 'NOT_REVIEWED',
      license: row.license || null, fetchedAt: row.fetchedAt,
    });
  }
  return [...result.values()];
}

export function selectCandidates(pool, count = 200) {
  const quotas = { skills_sh: 60, awesome_agent_skills: 40, trendshift: 20, mcp_registry: 50, github_search: 30 };
  const selected = new Map();
  const publisherCounts = new Map();
  function add(row, diversify) {
    if (selected.has(row.id)) return false;
    const publisher = row.repositoryUrl?.split('/')[3] || row.publisher || row.canonicalUrl;
    if (diversify && row.type === 'SKILL' && (publisherCounts.get(publisher) || 0) >= 5) return false;
    selected.set(row.id, row);
    publisherCounts.set(publisher, (publisherCounts.get(publisher) || 0) + 1);
    return true;
  }
  for (const source of SOURCE_ORDER) {
    let added = 0;
    const sourcePool = pool.filter(r => r.source === source);
    // Round-robin over MCP use-case queries, rather than taking an alphabetical
    // block of servers from one namespace or one keyword.
    const ordered = source === 'mcp_registry' ? interleaveQueries(sourcePool) : sourcePool;
    for (const row of ordered) {
      if (selected.size >= count || added >= quotas[source]) break;
      if (add(row, true)) added++;
    }
  }
  // A source shortfall is explicit in the report; never invent records to meet a quota.
  for (const row of pool) { if (selected.size >= count) break; add(row, true); }
  return [...selected.values()].sort((a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source));
}

function interleaveQueries(rows) {
  const groups = new Map();
  for (const row of rows) {
    const query = row.metadata.discoveryQuery || 'other';
    if (!groups.has(query)) groups.set(query, []);
    groups.get(query).push(row);
  }
  const ordered = [];
  while ([...groups.values()].some(group => group.length)) {
    for (const group of groups.values()) if (group.length) ordered.push(group.shift());
  }
  return ordered;
}

export async function atomicJson(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, path);
}

export function createHttp({ cacheDir, fresh = false, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = () => Date.now() }) {
  const lastRequests = new Map();
  return async function request(input, { github = false, maxAgeMs = 86_400_000 } = {}) {
    let url = new URL(input);
    if (url.protocol !== 'https:' || !HOSTS.has(url.hostname) || url.username || url.password || url.port) throw new Error('Disallowed source URL');
    await mkdir(cacheDir, { recursive: true });
    const path = join(cacheDir, `${hash(input)}.json`);
    let cached;
    try { cached = JSON.parse(await readFile(path, 'utf8')); } catch { /* Cache miss. */ }
    if (!fresh && cached && now() - Date.parse(cached.revalidatedAt || cached.fetchedAt) < maxAgeMs) return { ...cached, cacheHit: true };
    for (let attempt = 0; attempt < 3; attempt++) {
      const gap = url.hostname === 'api.github.com' ? 6500 : 750;
      await sleep(Math.max(0, gap - (now() - (lastRequests.get(url.hostname) || 0))));
      lastRequests.set(url.hostname, now());
      const headers = { 'User-Agent': 'WindiStudio-CandidateCollector/1.0', Accept: github ? 'application/vnd.github+json' : '*/*' };
      if (github && url.hostname === 'api.github.com') {
        headers['X-GitHub-Api-Version'] = '2022-11-28';
        if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
      }
      if (cached?.etag) headers['If-None-Match'] = cached.etag;
      let response;
      try { response = await fetchImpl(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(25000) }); }
      catch { if (attempt < 2) { await sleep(1000 * 2 ** attempt); continue; } throw new Error(`Network/timeout: ${url.hostname}`); }
      if ([301, 302, 307, 308].includes(response.status)) {
        const target = new URL(response.headers.get('location'), url);
        if (target.protocol !== 'https:' || !HOSTS.has(target.hostname) || target.username || target.password || target.port) throw new Error('Unsafe source redirect');
        url = target; continue;
      }
      if (response.status === 304 && cached) {
        const revalidated = { ...cached, revalidatedAt: new Date(now()).toISOString() };
        await atomicJson(path, revalidated);
        return { ...revalidated, cacheHit: true };
      }
      if ([429, 403, 500, 502, 503, 504].includes(response.status)) {
        const retry = response.headers.get('retry-after');
        const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
        const retryMs = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - now()) : 0;
        const delay = Math.max(retryMs || 0, response.headers.get('x-ratelimit-remaining') === '0' ? reset - now() : 0, 1000 * 2 ** attempt);
        if (delay > 30000 || attempt === 2 || (response.status === 403 && !retry && response.headers.get('x-ratelimit-remaining') !== '0')) throw new Error(`Source HTTP ${response.status}; defer this source`);
        await sleep(delay + Math.floor(Math.random() * 250)); continue;
      }
      if (!response.ok) throw new Error(`Source HTTP ${response.status}: ${url.hostname}`);
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 5_000_000) { await reader.cancel(); throw new Error('Source response too large'); }
        chunks.push(chunk.value);
      }
      const entry = { url: url.toString(), status: response.status, etag: response.headers.get('etag'), fetchedAt: new Date(now()).toISOString(), text: Buffer.concat(chunks).toString('utf8') };
      await atomicJson(path, entry);
      return entry;
    }
    throw new Error('Too many source redirects/retries');
  };
}
