import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {test,expect} from 'vitest';
import {hash} from '../scripts/ingestion/core.mjs';
import {importRows} from '../scripts/import-catalog.mjs';
import {creatorImportSql} from '../scripts/prepare-creator-import.mjs';
import {socialPost} from '../scripts/build-creator-catalog.mjs';
import {creatorBrief,matchesPurpose,normalizeSearch,purposeCategories} from '../lib/creator-catalog';
const catalog=JSON.parse(await readFile('data/catalog/creator-100.json','utf8'));
test('100 unique creator dossiers have complete Vietnamese content and dated primary-source metrics',async()=>{
  expect(catalog.resources).toHaveLength(100);
  expect(new Set(catalog.resources.map((r:any)=>r.repository_url.toLowerCase())).size).toBe(100);
  expect(hash(JSON.stringify(catalog.resources))).toBe(catalog.contentHash);
  expect(catalog.resources.filter((r:any)=>r.import_metadata.creatorCatalog.primaryCategory==='tech')).toHaveLength(4);
  for(const r of catalog.resources){
    const brief=creatorBrief(r.import_metadata);expect(brief).not.toBeNull();
    expect(brief!.github.archived).toBe(false);expect(brief!.trending).toBeNull();
    expect(r.description.length).toBeGreaterThan(80);expect(r.long_description.length).toBeGreaterThan(350);
    expect(r.import_metadata.humanizer).toMatchObject({source:'blader/humanizer',version:'2.11.2'});
    expect(r.long_description).not.toContain('ĐIỂM NỔI BẬT');expect(r.long_description).not.toContain('GỢI Ý ỨNG DỤNG');
    expect(r.status).toBe('CANDIDATE');expect(r.sources.length).toBeGreaterThanOrEqual(2);
    expect(r.license.length).toBeLessThanOrEqual(200);expect(r.tagline.length).toBeLessThanOrEqual(240);
    expect(brief!.readme.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(socialPost(r)).toContain(r.repository_url);expect(socialPost(r)).toContain('không phải số người dùng');
  }
  const authored=(await Promise.all((await readdir('data/catalog/editorial')).filter(x=>x.endsWith('.json')).map(async x=>JSON.parse(await readFile(`data/catalog/editorial/${x}`,'utf8'))))).flat();
  expect(authored).toHaveLength(100);expect(new Set(authored.map(x=>x.hook)).size).toBe(100);
});
test('purpose and Vietnamese search are predictable; malformed source metadata is rejected',()=>{
  expect(purposeCategories).toHaveLength(10);
  expect(normalizeSearch('Phụ đề TIẾNG VIỆT')).toBe('phu de tieng viet');
  expect(matchesPurpose({purposes:['video','audio']},'video')).toBe(true);
  expect(matchesPurpose({purposes:['video']},'tech')).toBe(false);
  expect(creatorBrief(null)).toBeNull();expect(creatorBrief({creatorCatalog:{edition:'creator-100-v1'}})).toBeNull();
  for(const patch of [{rank:-1},{selected:'yes'},{github:{stars:-1}},{trending:{rank:1,url:'javascript:alert(1)'}}]){
    const c=structuredClone(catalog.resources[0].import_metadata);Object.assign(c.creatorCatalog,patch);expect(creatorBrief(c)).toBeNull();
  }
});
test('creator import is resumable, never publishes, archives only old snapshot candidates and preserves user edits',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; grant usage on schema public,auth to anon,authenticated,service_role; create table profiles(id uuid primary key,role text);`);
    await db.exec(await readFile('supabase/migrations/20260903084313_windi_catalog_media_import.sql','utf8'));
    await db.exec(await readFile('supabase/migrations/20260903131154_windi_editorial_review.sql','utf8'));
    const old=importRows(JSON.parse(await readFile('data/catalog/candidates.json','utf8')),[]);
    await db.query('select import_windi_catalog($1::jsonb,$2,$3)',[JSON.stringify(old),'old','old-hash']);
    const previous=(await db.query('select * from resources')).rows;
    const sql=creatorImportSql(catalog,previous);
    await expect(db.exec(sql.finalize)).rejects.toThrow('All 100 dossiers');await db.exec('rollback');
    for(const batch of sql.batches)await db.exec(batch);
    await db.exec(sql.finalize);
    const counts=(await db.query<{status:string;n:number}>('select status,count(*)::int n from resources group by status')).rows;
    expect(counts.find(x=>x.status==='CANDIDATE')?.n).toBe(100);
    expect(counts.find(x=>x.status==='ARCHIVED')?.n).toBe(sql.archiveCount);
    const metrics=(await db.query('select count(*)::int n from resource_metric_snapshots')).rows;
    await db.exec("update resources set name='Human edit',editorial_revision=editorial_revision+1,status='REVIEW' where import_metadata#>>'{creatorCatalog,rank}'='1'");
    for(const batch of sql.batches)await db.exec(batch);
    await db.exec(sql.finalize);
    expect((await db.query("select name from resources where import_metadata#>>'{creatorCatalog,rank}'='1'")).rows).toEqual([{name:'Human edit'}]);
    expect((await db.query('select count(*)::int n from resource_metric_snapshots')).rows).toEqual(metrics);
    expect((await db.query("select count(*)::int n from resource_import_runs where imported_count=100")).rows).toEqual([{n:1}]);
    await db.exec('set role anon');expect((await db.query('select count(*)::int n from resources')).rows).toEqual([{n:0}]);await db.exec('reset role');
  }finally{await db.close();}
},30000);
