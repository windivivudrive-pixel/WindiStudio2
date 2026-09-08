import { afterAll, beforeAll, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const observedAt = '2026-09-07T12:00:00Z';
const observation = (i: number) => ({ identity: `repo:https://github.com/owner${i}/tool${i}`, canonicalUrl: `https://github.com/owner${i}/tool${i}`, stars: 100 + i, fitScore: 90, needs: ['video'], pushedAt: '2026-09-06T00:00:00Z', observedAt });
const selected = (i: number) => ({ ...observation(i), name: `owner${i}/tool${i}`, tagline: 'Ứng viên đang chờ biên tập viên kiểm tra.', description: 'Official repository description.', longDescription: 'Ứng viên được hệ thống chọn tự động và cần dùng thử trước khi xuất bản.', documentationUrl: `https://raw.githubusercontent.com/owner${i}/tool${i}/main/README.md`, homepageUrl: '', license: 'MIT', access: 'DESKTOP_OPTION_CLAIMED', flags: [], sources: [], readme: { sha256: 'a'.repeat(64) }, ranking: { version: 'nontech-growth-v1', total: 85, components: {}, primaryNeed: 'video' } });

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    grant usage on schema public to anon, authenticated, service_role;`);
  await db.exec(await readFile('supabase/migrations/20260903084313_windi_catalog_media_import.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260907135543_repo_discovery_review_queue.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260907151200_auto_discovery_candidate_queue.sql', 'utf8'));
}, 30000);
afterAll(async () => { await db.close(); });

test('transactionally adds only a 5-10 item REVIEW batch and records all observations', async () => {
  const observations = Array.from({ length: 8 }, (_, i) => observation(i));
  const candidates = Array.from({ length: 5 }, (_, i) => selected(i));
  await db.exec('set role service_role');
  const response = await db.query<{ result: { insertedCount: number; resourceStatus: string } }>(
    'select import_windi_repo_discovery($1::jsonb,$2::jsonb,$3,$4) result',
    [JSON.stringify(observations), JSON.stringify(candidates), 'run-test-1', 'a'.repeat(64)],
  );
  await db.exec('reset role');
  expect(response.rows[0].result).toMatchObject({ insertedCount: 5, resourceStatus: 'CANDIDATE' });
  expect((await db.query("select count(*)::int n from resources where status='CANDIDATE'")).rows).toEqual([{ n: 5 }]);
  expect((await db.query('select count(*)::int n from repo_discovery_observations')).rows).toEqual([{ n: 8 }]);
  expect((await db.query('select count(*)::int n from resource_evidence_jobs')).rows).toEqual([{ n: 5 }]);
  expect((await db.query("select count(*)::int n from resources where status='PUBLISHED' or is_editor_pick or is_sponsored")).rows).toEqual([{ n: 0 }]);
});

test('same run is idempotent and a changed payload hash is rejected', async () => {
  const observations = Array.from({ length: 8 }, (_, i) => observation(i));
  const candidates = Array.from({ length: 5 }, (_, i) => selected(i));
  const same = await db.query<{ result: { insertedCount: number } }>('select import_windi_repo_discovery($1::jsonb,$2::jsonb,$3,$4) result', [JSON.stringify(observations), JSON.stringify(candidates), 'run-test-1', 'a'.repeat(64)]);
  expect(same.rows[0].result.insertedCount).toBe(5);
  await expect(db.query('select import_windi_repo_discovery($1::jsonb,$2::jsonb,$3,$4)', [JSON.stringify(observations), JSON.stringify(candidates), 'run-test-1', 'b'.repeat(64)])).rejects.toThrow('mismatch');
});

test('refuses undersized batches and does not resurrect rejected identities', async () => {
  const four = Array.from({ length: 4 }, (_, i) => selected(20 + i));
  await expect(db.query('select import_windi_repo_discovery($1::jsonb,$2::jsonb,$3,$4)', [JSON.stringify(four), JSON.stringify(four), 'run-test-2', 'c'.repeat(64)])).rejects.toThrow('5 to 10');
  await db.query(`insert into resources(external_identity,slug,type,status,name,canonical_url) values($1,'rejected-existing','OPEN_SOURCE','REJECTED','Rejected',$2)`, [selected(10).identity, selected(10).canonicalUrl]);
  const five = Array.from({ length: 5 }, (_, i) => selected(10 + i));
  await expect(db.query('select import_windi_repo_discovery($1::jsonb,$2::jsonb,$3,$4)', [JSON.stringify(five), JSON.stringify(five), 'run-test-3', 'd'.repeat(64)])).rejects.toThrow('fewer than five');
  expect((await db.query("select count(*)::int n from resources where status='CANDIDATE'")).rows).toEqual([{ n: 5 }]);
});

test('anonymous users cannot read observations, runs or pending resources, or call the import RPC', async () => {
  await db.exec('set role anon');
  try {
    await expect(db.query('select * from repo_discovery_observations')).rejects.toThrow('permission denied');
    await expect(db.query('select * from repo_discovery_runs')).rejects.toThrow('permission denied');
    expect((await db.query('select count(*)::int n from resources')).rows).toEqual([{ n: 0 }]);
    await expect(db.query("select import_windi_repo_discovery('[]','[]','run-public','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')")).rejects.toThrow('permission denied');
  } finally { await db.exec('reset role'); }
});
