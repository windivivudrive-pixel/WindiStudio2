import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHttp, hash, identity, mergeCandidates, repositoryUrl, safeUrl, selectCandidates } from '../scripts/ingestion/core.mjs';
import { parseAwesome, parseGitHub, parseRegistry, parseSkills, parseTrendshift, robotsAllows } from '../scripts/ingestion/adapters.mjs';

const row = { name: 'Example', type: 'MCP', repositoryUrl: 'https://github.com/Owner/Repo.git', canonicalUrl: 'https://github.com/Owner/Repo', source: 'mcp_registry', sourceId: 'io.example/server', sourceUrl: 'https://registry.modelcontextprotocol.io', listingUrl: 'https://registry.modelcontextprotocol.io', fetchedAt: '2026-09-03T00:00:00Z' };

describe('candidate identities and editorial boundary', () => {
  it('canonicalizes repository case, suffix and subpaths', () => {
    expect(repositoryUrl('https://github.com/Owner/Repo.git/tree/main?utm_source=test')).toBe('https://github.com/owner/repo');
  });
  it('rejects javascript, local and credential-bearing URLs', () => {
    for (const url of ['javascript:alert(1)', 'http://github.com/a/b', 'https://localhost/a', 'https://u:p@example.org', 'https://127.0.0.1/a']) expect(safeUrl(url)).toBeNull();
  });
  it('merges MCP/GitHub duplicates with both source attributions', () => {
    const merged = mergeCandidates([row, { ...row, type: 'OPEN_SOURCE', source: 'github_search', sourceId: '123' }]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sources).toHaveLength(2);
  });
  it('preserves distinct skill sub-resources in one repository', () => {
    expect(identity({ ...row, type: 'SKILL', skillId: 'pdf' })).not.toBe(identity({ ...row, type: 'SKILL', skillId: 'docx' }));
  });
  it('deduplicates skill identity across the two skills directories', () => {
    const skill = { ...row, type: 'SKILL', skillId: 'pdf', source: 'skills_sh' };
    expect(mergeCandidates([skill, { ...skill, source: 'awesome_agent_skills', canonicalUrl: 'https://officialskills.sh/owner/repo/pdf' }])).toHaveLength(1);
  });
  it('cannot import editorial approval, paid badges or upstream scores', () => {
    const [candidate] = mergeCandidates([{ ...row, status: 'PUBLISHED', windiScore: 100, editorialBadges: ['EDITOR'], sponsored: true }]);
    expect(candidate.status).toBe('CANDIDATE');
    expect(candidate.windiScore).toBeNull();
    expect(candidate.editorialBadges).toEqual([]);
    expect(candidate).not.toHaveProperty('sponsored');
  });
  it('does not fabricate candidates when quota cannot be reached', () => {
    expect(selectCandidates(mergeCandidates([row]))).toHaveLength(1);
  });
});

describe('source formats', () => {
  it('respects robots disallow paths, wildcards and specific allow exceptions', () => {
    const rules = 'User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /weekly\nAllow: /weekly/public\nDisallow: /*.zip$';
    expect(robotsAllows(rules, '/')).toBe(true);
    expect(robotsAllows(rules, '/api/skills')).toBe(false);
    expect(robotsAllows(rules, '/weekly')).toBe(false);
    expect(robotsAllows(rules, '/weekly/public')).toBe(true);
    expect(robotsAllows(rules, '/assets/file.zip')).toBe(false);
  });
  it('does not infer nonexistent GitHub repos from directory or domain-hosted skills', () => {
    expect(parseAwesome('- **[vendor/pdf](https://officialskills.sh/vendor/skills/pdf)**')).toEqual([]);
    const serialized = JSON.stringify('x:{"initialSkills":[{"source":"vendor.example","skillId":"pdf","name":"pdf","installs":21}]}');
    expect(parseSkills(`<script>self.__next_f.push([1,${serialized}])</script>`)).toEqual([]);
  });
  it('extracts skills from serialized data without executing upstream JavaScript', () => {
    const serialized = JSON.stringify('x:{"initialSkills":[{"source":"owner/repo","skillId":"pdf","name":"pdf","installs":21,"weeklyInstalls":[1,2]}]}');
    const html = `<script>self.__next_f.push([1,${serialized}])</script>`;
    expect(parseSkills(html)[0]).toMatchObject({ name: 'pdf', skillId: 'pdf', metrics: [{ kind: 'skills_sh_installs', value: 21 }] });
  });
  it('retains canonical tree paths and ignores sponsor links in Awesome', () => {
    const text = '- **[vendor/pdf](https://github.com/vendor/skills/tree/main/pdf)** - Description\n- [Sponsor](https://example.org)';
    expect(parseAwesome(text)).toHaveLength(1);
    expect(parseAwesome(text)[0].canonicalUrl).toContain('/tree/main/pdf');
  });
  it('extracts only project links from Trendshift, not paid featured links', () => {
    const html = '<a href="https://github.com/sponsor/repo">Paid</a><a href="/repositories/1">owner/repo</a>';
    expect(parseTrendshift(html)).toHaveLength(1);
  });
  it('imports only latest active MCP versions and no secret arguments', () => {
    const active = { server: { name: 'io.example/mcp', version: '1', packages: [{ registryType: 'npm', identifier: 'some-package', environmentVariables: [{ name: 'SECRET', default: 'must-not-copy' }] }] }, _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', isLatest: true } } };
    const rows = parseRegistry({ servers: [active, { ...active, _meta: {} }] });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('must-not-copy');
  });
  it('rejects incomplete GitHub results and excludes unknown licenses', () => {
    expect(() => parseGitHub({ incomplete_results: true, items: [] })).toThrow();
    expect(parseGitHub({ items: [{ name: 'tool', license: null }] })).toEqual([]);
  });
});

describe('bounded HTTP, cache and rate-limit behavior', () => {
  it('refuses unapproved source hosts before fetching', async () => {
    const http = createHttp({ cacheDir: '/unused' });
    await expect(http('https://evil.example/payload')).rejects.toThrow('Disallowed');
  });
  it('uses cached data without a second network request', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'windi-http-test-'));
    let calls = 0;
    const http = createHttp({ cacheDir, sleep: async () => {}, fetchImpl: async () => { calls++; return new Response('test', { status: 200 }); } });
    await http('https://skills.sh/');
    const second = await http('https://skills.sh/');
    expect(calls).toBe(1);
    expect(second.cacheHit).toBe(true);
  });
  it('backs off for 429 then succeeds', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'windi-http-retry-'));
    let calls = 0;
    const sleeps: number[] = [];
    const http = createHttp({ cacheDir, sleep: async ms => { sleeps.push(ms); }, fetchImpl: async () => ++calls === 1 ? new Response('', { status: 429, headers: { 'retry-after': '1' } }) : new Response('ok') });
    expect((await http('https://skills.sh/')).text).toBe('ok');
    expect(calls).toBe(2);
    expect(sleeps.some(ms => ms >= 1000)).toBe(true);
  });
  it('preserves prior cached evidence when a fresh request fails', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'windi-http-failure-'));
    const url = 'https://skills.sh/';
    await createHttp({ cacheDir, sleep: async () => {}, fetchImpl: async () => new Response('last-good') })(url);
    const http = createHttp({ cacheDir, fresh: true, sleep: async () => {}, fetchImpl: async () => new Response('', { status: 503 }) });
    await expect(http(url)).rejects.toThrow('503');
    expect(JSON.parse(await readFile(join(cacheDir, `${hash(url)}.json`), 'utf8')).text).toBe('last-good');
  });
  it('does not bypass long retry-after windows', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'windi-http-defer-'));
    const http = createHttp({ cacheDir, sleep: async () => {}, fetchImpl: async () => new Response('', { status: 429, headers: { 'retry-after': '120' } }) });
    await expect(http('https://skills.sh/')).rejects.toThrow('defer');
  });
  it('does not follow redirects to arbitrary hosts', async () => {
    const cacheDir = await mkdtemp(join(tmpdir(), 'windi-http-redirect-'));
    const http = createHttp({ cacheDir, sleep: async () => {}, fetchImpl: async () => new Response('', { status: 302, headers: { location: 'https://evil.example' } }) });
    await expect(http('https://skills.sh/')).rejects.toThrow('Unsafe');
  });
});
