import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, test } from 'vitest';
import { importRows } from '../scripts/import-catalog.mjs';

const db = new PGlite();
let payload: unknown[];
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.profiles(id integer primary key, role text);
    create table public.transactions(id integer primary key, amount integer);
    insert into profiles values(1,'admin'); insert into transactions values(1,500);
    grant usage on schema public to anon,authenticated,service_role;`);
  await db.exec(await readFile('supabase/migrations/20260903084313_windi_catalog_media_import.sql','utf8'));
  payload = importRows(JSON.parse(await readFile('data/catalog/candidates.json','utf8')), JSON.parse(await readFile('data/catalog/community-evidence.json','utf8')).entries);
}, 30000);
afterAll(async () => { await db.close(); });

test('imports exactly 200 candidates and evidence jobs transactionally, preserving legacy records', async () => {
  await db.exec('set role service_role');
  const result = await db.query<{ result: {count:number} }>('select import_windi_catalog($1::jsonb,$2,$3) result',[JSON.stringify(payload),'test-run','test-hash']);
  expect(result.rows[0].result.count).toBe(200);
  await db.exec('reset role');
  expect((await db.query('select count(*)::int n from resources')).rows).toEqual([{n:200}]);
  expect((await db.query('select count(*)::int n from resource_evidence_jobs')).rows).toEqual([{n:200}]);
  expect((await db.query("select count(*)::int n from resource_community_evidence where status='REVIEW'")).rows).toEqual([{n:2}]);
  expect((await db.query("select count(*)::int n from resource_evidence_media where rights_basis <> 'LINK_ONLY'")).rows).toEqual([{n:0}]);
  expect((await db.query("select count(*)::int n from resources where status <> 'CANDIDATE' or is_editor_pick or is_official or is_sponsored")).rows).toEqual([{n:0}]);
  expect((await db.query('select * from transactions')).rows).toEqual([{id:1,amount:500}]);
  expect((await db.query('select * from profiles')).rows).toEqual([{id:1,role:'admin'}]);
});

test('retry is idempotent and changed payload key is rejected', async () => {
  const result = await db.query<{ result: {status:string} }>('select import_windi_catalog($1::jsonb,$2,$3) result',[JSON.stringify(payload),'test-run','test-hash']);
  expect(result.rows[0].result.status).toBe('already_imported');
  await expect(db.query('select import_windi_catalog($1::jsonb,$2,$3)',[JSON.stringify(payload),'test-run','different'])).rejects.toThrow('mismatch');
  expect((await db.query('select count(*)::int n from resources')).rows).toEqual([{n:200}]);
});

test('public cannot see candidates, raw metadata, research jobs or invoke imports', async () => {
  await db.exec('set role anon');
  try {
    expect((await db.query('select count(*)::int n from resources')).rows).toEqual([{n:0}]);
    await expect(db.query('select raw_metadata from resource_sources')).rejects.toThrow('permission denied');
    await expect(db.query('select * from resource_evidence_jobs')).rejects.toThrow('permission denied');
    await expect(db.query("select import_windi_catalog('[]','x','x')")).rejects.toThrow('permission denied');
    await expect(db.query("update resources set status='PUBLISHED'")).rejects.toThrow('permission denied');
  } finally { await db.exec('reset role'); }
});

test('published evidence requires review; public media cannot leak from an unpublished parent', async () => {
  const { rows: [resource] } = await db.query<{id:string}>('select id from resources order by slug limit 1');
  await db.query("insert into auth.users values('00000000-0000-0000-0000-000000000001')");
  const {rows:[evidence]} = await db.query<{id:string}>(`insert into resource_community_evidence(resource_id,source_url,platform,author_name,author_relationship,title,summary_vi,resource_match,match_explanation,observed_at)
    values($1,'https://example.com/post','Forum','Test','USER','Test','Test','EXACT','Test',now()) returning id`,[resource.id]);
  await expect(db.query("update resource_community_evidence set status='PUBLISHED' where id=$1",[evidence.id])).rejects.toThrow();
  await db.query("update resource_community_evidence set status='PUBLISHED',verified_at=now(),verified_by='00000000-0000-0000-0000-000000000001',review_reason='Local test only' where id=$1",[evidence.id]);
  await db.query("insert into resource_evidence_media(evidence_id,kind,source_url,alt_text) values($1,'SOURCE_LINK','https://example.com/post','Test')",[evidence.id]);
  await db.exec('set role anon');
  expect((await db.query('select count(*)::int n from resource_evidence_media')).rows).toEqual([{n:0}]);
  await db.exec('reset role');
  await db.query("update resources set status='PUBLISHED',published_at=now(),last_reviewed_at=now() where id=$1",[resource.id]);
  await db.exec('set role authenticated');
  try {
    expect((await db.query('select count(*)::int n from resources')).rows).toEqual([{n:1}]);
    expect((await db.query('select count(*)::int n from resource_evidence_media')).rows).toEqual([{n:1}]);
    await expect(db.query("update resource_community_evidence set review_reason='client'")).rejects.toThrow('permission denied');
  } finally { await db.exec('reset role'); }
});
