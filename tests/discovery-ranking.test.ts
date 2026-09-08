import { describe, expect, it } from 'vitest';
import { rankDiscoveryCandidates, selectReviewBatch } from '../scripts/ingestion/discovery-ranking.mjs';
import { buildDiscoveryPayload, loadDiscoveryDatabaseState } from '../scripts/ingestion/supabase-discovery.mjs';

const now = Date.parse('2026-09-07T12:00:00Z');
const candidate = (index: number, patch: Record<string, unknown> = {}) => ({
  id: `github:${index}`,
  identity: `repo:https://github.com/owner${index}/tool${index}`,
  name: `owner${index}/tool${index}`,
  canonicalUrl: `https://github.com/owner${index}/tool${index}`,
  metadata: { description: `Useful app ${index}`, stars: 1000 + index, license: 'MIT', homepage: null, pushedAt: '2026-09-06T00:00:00Z' },
  readme: { url: `https://raw.githubusercontent.com/owner${index}/tool${index}/main/README.md`, observedAt: '2026-09-07T12:00:00Z', sha256: 'a'.repeat(64) },
  sources: [{ id: 'search:video', url: 'https://api.github.com/search/repositories', fetchedAt: '2026-09-07T12:00:00Z' }],
  fit: { lane: 'PRIORITY_REVIEW', score: 90, needs: [index % 2 ? 'video' : 'audio'], access: 'DESKTOP_OPTION_CLAIMED', flags: [], reasons: [], firstTask: 'Thử một đầu ra.' },
  ...patch,
});

describe('six-hour discovery ranking', () => {
  it('combines usefulness, current heat, star growth and catalog gaps', () => {
    const row = candidate(1);
    const ranked = rankDiscoveryCandidates([row], {
      resources: [{ status: 'PUBLISHED', import_metadata: { creatorCatalog: { categories: ['video'] } } }],
      allIdentities: new Set(),
      previousStars: new Map([[row.identity, { github_stars: 900, observed_at: '2026-09-06T12:00:00Z' }]]),
    }, { now });
    expect(ranked[0].ranking.starDelta).toBe(101);
    expect(ranked[0].ranking.starsPerDay).toBe(101);
    expect(ranked[0].ranking.components.growth).toBeGreaterThan(0);
    expect(ranked[0].ranking.components.catalogGap).toBeLessThan(15);
  });

  it('excludes every identity already present in Supabase, regardless of status', () => {
    const row = candidate(2);
    for (const status of ['PUBLISHED', 'REVIEW', 'REJECTED', 'ARCHIVED']) {
      expect(rankDiscoveryCandidates([row], { resources: [], allIdentities: new Set([row.identity]), previousStars: new Map() }, { now })).toEqual([]);
      expect(status).toBeTruthy();
    }
  });

  it('selects eight diverse repos and never pads a batch below five', () => {
    const ranked = rankDiscoveryCandidates(Array.from({ length: 12 }, (_, i) => candidate(i)), { resources: [], allIdentities: new Set(), previousStars: new Map() }, { now });
    expect(selectReviewBatch(ranked)).toEqual([]);
    const diverse = rankDiscoveryCandidates(Array.from({ length: 12 }, (_, i) => candidate(i, { fit: { ...candidate(i).fit, needs: [['video', 'audio', 'image', 'office', 'content', 'automation'][i % 6]], lane: 'PRIORITY_REVIEW', score: 90, access: 'DESKTOP_OPTION_CLAIMED', flags: [], reasons: [], firstTask: 'Test' } })), { resources: [], allIdentities: new Set(), previousStars: new Map() }, { now });
    expect(selectReviewBatch(diverse)).toHaveLength(8);
    expect(selectReviewBatch(diverse.slice(0, 4))).toEqual([]);
  });

  it('builds a bounded review payload without publication fields', () => {
    const ranked = rankDiscoveryCandidates(Array.from({ length: 8 }, (_, i) => candidate(i, { fit: { ...candidate(i).fit, needs: [['video', 'audio', 'image', 'office'][i % 4]], lane: 'PRIORITY_REVIEW', score: 90, access: 'DESKTOP_OPTION_CLAIMED', flags: [], reasons: [], firstTask: 'Test' } })), { resources: [], allIdentities: new Set(), previousStars: new Map() }, { now });
    const payload = buildDiscoveryPayload({ generatedAt: new Date(now).toISOString(), candidates: ranked }, ranked, now);
    expect(payload.candidates).toHaveLength(8);
    expect(payload.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(payload)).not.toContain('PUBLISHED');
    expect(payload.candidates.every(row => row.ranking.total <= 100)).toBe(true);
  });

  it('loads all catalog states and keeps the newest prior star observation', async () => {
    const state = await loadDiscoveryDatabaseState({
      config: { url: 'https://example.supabase.co', key: 'test' },
      request: async (_config, path) => path.startsWith('resources?')
        ? [{ external_identity: candidate(1).identity, repository_url: candidate(1).canonicalUrl, status: 'REJECTED', import_metadata: {} }]
        : [
          { external_identity: candidate(1).identity, github_stars: 20, observed_at: '2026-09-07T06:00:00Z' },
          { external_identity: candidate(1).identity, github_stars: 10, observed_at: '2026-09-07T00:00:00Z' },
        ],
    });
    expect(state.allIdentities.has(candidate(1).identity)).toBe(true);
    expect(state.rejectedIdentities.has(candidate(1).identity)).toBe(true);
    expect(state.previousStars.get(candidate(1).identity).github_stars).toBe(20);
  });

  it('paginates the catalog so an old rejected repo cannot fall past the API row limit', async () => {
    const resources = Array.from({ length: 1001 }, (_, i) => ({
      external_identity: candidate(i).identity,
      repository_url: candidate(i).canonicalUrl,
      status: i === 1000 ? 'REJECTED' : 'PUBLISHED',
      import_metadata: {},
    }));
    const state = await loadDiscoveryDatabaseState({
      config: { url: 'https://example.supabase.co', key: 'test' },
      request: async (_config, path) => {
        const offset = Number(new URL(`https://example.test/${path}`).searchParams.get('offset') || 0);
        return path.startsWith('resources?') ? resources.slice(offset, offset + 1000) : [];
      },
    });
    expect(state.allIdentities).toHaveProperty('size', 1001);
    expect(state.rejectedIdentities.has(candidate(1000).identity)).toBe(true);
  });
});
