import { describe, it, expect } from 'vitest';
import { parseCreatorList, evaluateRepo, makeCandidate, selectCreatorCandidates } from '../scripts/ingestion/creator-fit.mjs';
import { collectCreatorRun, verifyCreatorRun } from '../scripts/collect-creator-candidates.mjs';
import { loadRejectedRepositoryIdentities } from '../scripts/ingestion/supabase-rejections.mjs';
const now = Date.parse('2026-09-07T00:00:00Z');
const repo = { id: 1, name: 'voice-desk', full_name: 'maker/voice-desk', html_url: 'https://github.com/maker/voice-desk', description: 'Desktop application for transcription and subtitles', stargazers_count: 500, license: { spdx_id: 'MIT' }, pushed_at: '2026-09-01T00:00:00Z', default_branch: 'main', topics: [], private: false, archived: false, fork: false };
const doc = { text: 'Desktop application. Installation instructions. Screenshot and tutorial. Transcription and subtitles.', url: 'https://raw.githubusercontent.com/maker/voice-desk/main/README.md', fetchedAt: '2026-09-07T00:00:00Z' };
const source = { id: 'github-metadata', url: 'https://api.github.com/repos/maker/voice-desk', fetchedAt: doc.fetchedAt };

describe('nontech relevance and evidence', () => {
  it('prioritizes an accessible documented application, without inventing tested quality or price', () => {
    const fit = evaluateRepo(repo, doc, { now });
    expect(fit.lane).toBe('PRIORITY_REVIEW');
    expect(fit.handsOnTest).toBe('NOT_TESTED');
    expect(fit.pricing).toBe('NOT_VERIFIED');
    expect(fit.vietnameseSupport).toBe('NOT_TESTED');
    expect(fit.evidence.every(e => e.url === doc.url)).toBe(true);
  });
  it('does not let huge star counts rescue developer infrastructure', () => {
    const fit = evaluateRepo({ ...repo, description: 'SDK library for speech-to-text', stargazers_count: 500000 }, { ...doc, text: 'pip install speechkit. Installation. Examples.' }, { now });
    expect(fit.lane).toBe('EXCLUDED');
    expect(fit.components.adoption).toBe(5);
  });
  it('excludes cracked apps and SDK demo interfaces even with a high apparent access score', () => {
    expect(evaluateRepo({ ...repo, name: 'CapCut-Pro-Cracker' }, doc, { now }).lane).toBe('EXCLUDED');
    expect(evaluateRepo({ ...repo, description: 'PDF editing library with a desktop example app' }, doc, { now }).lane).toBe('EXCLUDED');
  });
  it('preserves README text between markdown arrows and blockquotes', () => {
    const fit = evaluateRepo(repo, { ...doc, text: '<- Read this. Download the `.dmg`. Installation. Screenshot. > Important note.' }, { now });
    expect(fit.lane).toBe('PRIORITY_REVIEW');
    expect(fit.access).toBe('DESKTOP_OPTION_CLAIMED');
  });
  it('holds an unclear license and missing README for review', () => {
    expect(evaluateRepo({ ...repo, license: null }, doc, { now }).lane).toBe('NEEDS_REVIEW');
    expect(evaluateRepo(repo, null, { now }).lane).toBe('NEEDS_REVIEW');
  });
  it('does not label self-hosted GUI as easy install', () => {
    const fit = evaluateRepo(repo, { ...doc, text: 'Transcription. Web UI. Installation: docker compose up. Requires NVIDIA CUDA GPU and API key. Example.' }, { now });
    expect(fit.lane).toBe('GUIDE_REQUIRED');
    expect(fit.access).toBe('SELF_HOSTED_UI_OR_UNCLEAR');
    expect(fit.flags).toContain('TECHNICAL_SETUP');
    expect(fit.flags).toContain('GPU_MENTIONED_VERIFY_REQUIREMENT');
  });
  it('rejects archived repos and holds stale/forked projects outside priority', () => {
    expect(evaluateRepo({ ...repo, archived: true }, doc, { now }).lane).toBe('EXCLUDED');
    expect(evaluateRepo({ ...repo, fork: true }, doc, { now }).lane).not.toBe('PRIORITY_REVIEW');
    expect(evaluateRepo({ ...repo, pushed_at: '2021-01-01' }, doc, { now }).lane).not.toBe('PRIORITY_REVIEW');
  });
  it('ignores sponsored links and never resolves a SaaS domain by guessing a repo', () => {
    const rows = parseCreatorList('- [Photo](https://saas.example) image editor\n- [App](https://github.com/maker/app) video editor\n- [Sponsored](https://github.com/ads/app) video editor\n[Badge](https://github.com/meta/badge) video editor', { id: 'list', homepage: 'https://github.com/org/list' }, doc.fetchedAt);
    expect(rows.map(r => r.repo)).toEqual(['maker/app']);
  });
  it('bounds repeated publishers and categories without padding weak candidates', () => {
    const rows = Array.from({ length: 12 }, (_, i) => makeCandidate({ ...repo, id: i, full_name: `maker/app${i}`, html_url: `https://github.com/maker/app${i}` }, doc, [source], now));
    expect(selectCreatorCandidates(rows)).toHaveLength(2);
    expect(selectCreatorCandidates([{ ...rows[0], fit: { ...rows[0].fit, lane: 'NEEDS_REVIEW' } }])).toHaveLength(0);
  });
});

describe('collector integration with fixture HTTP', () => {
  it('keeps useful sources on partial failure, deduplicates and protects the editorial boundary', async () => {
    const http = async (url: string) => {
      if (url.includes('awesome-generative-ai')) throw new Error('Source HTTP 503');
      if (url.includes('/search/')) return { text: JSON.stringify({ items: [repo], incomplete_results: false }), url, fetchedAt: doc.fetchedAt };
      if (url.includes('maker/voice-desk')) return doc;
      return { text: '- [Voice](https://github.com/maker/voice-desk) transcription GUI', url, fetchedAt: doc.fetchedAt };
    };
    const run = await collectCreatorRun({ http, now, existing: [{ repository_url: repo.html_url, import_metadata: { creatorCatalog: { readme: { sha256: 'old' } } } }] });
    expect(run.status).toBe('PARTIAL');
    expect(run.candidates).toHaveLength(1);
    expect(run.shortlist).toHaveLength(1);
    expect(run.candidates[0].existingCatalog).toBe(true);
    expect(run.candidates[0].readmeChanged).toBe(true);
    expect(run.databaseWritten).toBe(false);
    expect(run.published).toBe(false);
    expect(verifyCreatorRun(run)).toBe(true);
    expect(() => verifyCreatorRun({ ...run, candidates: [{ ...run.candidates[0], status: 'PUBLISHED' }] })).toThrow();
  });
  it('reports total source failure instead of claiming an empty success', async () => {
    const run = await collectCreatorRun({ http: async () => { throw new Error('Source unavailable'); }, now });
    expect(run.status).toBe('FAILED');
    expect(run.shortlist).toHaveLength(0);
  });
  it('excludes an editorially rejected repository before README retrieval or scoring', async () => {
    const calls: string[] = [];
    const run = await collectCreatorRun({
      now,
      refreshExisting: true,
      existing: [{ repository_url: repo.html_url }],
      rejectedIdentities: new Set(['repo:https://github.com/maker/voice-desk']),
      rejectionSnapshot: { count: 55, fetchedAt: doc.fetchedAt },
      http: async (url: string) => { calls.push(url); return { text: JSON.stringify({ items: [repo] }), url, fetchedAt: doc.fetchedAt }; },
    });
    expect(run.status).toBe('FAILED');
    expect(run.rejectedSkippedCount).toBe(1);
    expect(run.candidates).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });
  it('resolves a renamed repository through the canonical API without inventing a match', async () => {
    const renamed = { ...repo, full_name: 'maker/new-name', html_url: 'https://github.com/maker/new-name' };
    const run = await collectCreatorRun({ now, refreshExisting: true, existing: [{ repository_url: repo.html_url }], http: async (url: string) => {
      if (url.includes('/search/')) return { text: JSON.stringify({ items: [] }), url, fetchedAt: doc.fetchedAt };
      if (url.includes('api.github.com/repos/')) return { text: JSON.stringify(renamed), url, fetchedAt: doc.fetchedAt };
      return { ...doc, url };
    } });
    expect(run.status).toBe('SUCCESS');
    expect(run.candidates).toHaveLength(1);
    expect(run.candidates[0].canonicalUrl).toBe(renamed.html_url);
    expect(run.candidates[0].sources.some(s => s.id === 'github-canonical-resolution')).toBe(true);
  });
  it('uses the official README endpoint when the document is not at a conventional filename', async () => {
    const run = await collectCreatorRun({ now, refreshExisting: true, existing: [{ repository_url: repo.html_url }], http: async (url: string) => {
      if (url.includes('/search/')) return { text: JSON.stringify({ items: [repo] }), url, fetchedAt: doc.fetchedAt };
      if (url.includes('raw.githubusercontent.com')) throw new Error('Source HTTP 404');
      return { text: JSON.stringify({ encoding: 'base64', content: Buffer.from(doc.text).toString('base64') }), url, fetchedAt: doc.fetchedAt };
    } });
    expect(run.status).toBe('SUCCESS');
    expect(run.candidates[0].readme.url).toContain('/readme');
    expect(run.shortlist).toHaveLength(1);
  });
  it('refreshes known canonical repos without discovering or replacing editorial fields', async () => {
    const urls: string[] = [];
    const run = await collectCreatorRun({ now, refreshExisting: true, existing: [{ repository_url: repo.html_url, tagline: 'Keep my copy' }], http: async (url: string) => {
      urls.push(url);
      if (url.includes('/search/')) return { text: JSON.stringify({ items: [repo] }), url, fetchedAt: doc.fetchedAt };
      return doc;
    } });
    expect(run.mode).toBe('refresh-existing');
    expect(run.candidates[0].existingCatalog).toBe(true);
    expect(run.candidates[0]).not.toHaveProperty('tagline');
    expect(urls).toHaveLength(2);
  });
});

describe('Supabase rejection lookup', () => {
  it('normalizes persisted identity and repository URLs without retaining editorial text', async () => {
    const snapshot = await loadRejectedRepositoryIdentities({
      config: { url: 'https://example.supabase.co', key: 'test' },
      request: async () => [{
        external_identity: 'repo:https://github.com/Owner/Tool',
        canonical_url: 'https://github.com/Owner/Tool/tree/main',
        repository_url: 'https://github.com/Owner/Tool.git',
        updated_at: doc.fetchedAt,
      }],
    });
    expect(snapshot.count).toBe(1);
    expect(snapshot.identities).toEqual(new Set(['repo:https://github.com/owner/tool']));
  });
});
