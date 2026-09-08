import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { expect, test } from 'vitest';

const catalog = JSON.parse(await readFile('data/catalog/creator-100.json', 'utf8'));
const generated = JSON.parse(await readFile('data/catalog/easy-prompts.json', 'utf8'));

test('Easy Prompt batch contains safe bilingual prompts for every Creator dossier', () => {
  expect(generated.prompts).toHaveLength(100);
  expect(generated.failed ?? []).toEqual([]);
  const expected = new Set(catalog.resources.map((resource: { identity: string }) => resource.identity));
  for (const prompt of generated.prompts) {
    expect(expected.has(prompt.external_identity)).toBe(true);
    expect(prompt.source_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(prompt.source_url).toMatch(/^https:\/\//);
    for (const text of [prompt.prompt_vi, prompt.prompt_en]) {
      expect(text).toContain(prompt.source_url);
      expect(text).toMatch(/README/i);
      expect(text).toMatch(/secret|bí mật/i);
      expect(text).not.toMatch(/sk-[A-Za-z0-9]/);
    }
    expect(prompt.prompt_en).not.toMatch(/[À-ỹ]/);
  }
});

test('Easy Prompt database sync is service-only, public only sees published generated records, and changes become stale', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      grant usage on schema public,auth to anon,authenticated,service_role;`);
    await db.exec(await readFile('supabase/migrations/20260903084313_windi_catalog_media_import.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/20260903131154_windi_editorial_review.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/20260903221133_simplify_editorial_publish.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/20260904030422_easy_prompts.sql', 'utf8'));
    const input = generated.prompts[0];
    await db.query(`insert into resources(external_identity,slug,type,status,name,canonical_url,import_metadata,published_at,last_reviewed_at)
      values($1,'easy-prompt-test','SKILL','PUBLISHED','Easy Prompt Test',$2,'{}',now(),now())`, [input.external_identity, input.source_url]);
    await db.query(`insert into resource_sources(resource_id,source_type,source_identifier,source_url,fetched_at)
      select id,'github','easy-prompt-test',$2,now() from resources where external_identity=$1`, [input.external_identity, input.source_url]);
    await db.exec('set role service_role');
    const result = await db.query<{ result: { status: string; count: number } }>('select sync_windi_easy_prompts($1::jsonb,$2,$3) result', [JSON.stringify([input]), 'easy-prompt-test-run', 'a'.repeat(64)]);
    expect(result.rows[0].result).toEqual({ status: 'imported', count: 1 });
    await db.exec('reset role');
    await db.exec('set role anon');
    expect((await db.query('select count(*)::int n from resource_easy_prompts')).rows).toEqual([{ n: 1 }]);
    await expect(db.query("update resource_easy_prompts set status='STALE'")).rejects.toThrow('permission denied');
    await db.exec('reset role');
    await db.query("update resources set description='Source changed' where external_identity=$1", [input.external_identity]);
    expect((await db.query('select status from resource_easy_prompts')).rows).toEqual([{ status: 'STALE' }]);
    await db.exec('set role anon');
    expect((await db.query('select count(*)::int n from resource_easy_prompts')).rows).toEqual([{ n: 0 }]);
  } finally { await db.close(); }
}, 30000);
