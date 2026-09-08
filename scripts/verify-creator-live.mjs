import {readFile} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'dotenv';
import {databaseConfig,rest} from './import-catalog.mjs';
import {atomicJson} from './ingestion/core.mjs';
const config=await databaseConfig();if(config.projectRef!=='zpjphixcttehkkgxlmsn')throw Error('Wrong project');
const catalog=JSON.parse(await readFile('data/catalog/creator-100.json','utf8'));
const manifest=JSON.parse(await readFile('ops/creator100/manifest.json','utf8'));
const before=JSON.parse(await readFile(`${manifest.snapshotDirectory}/resources.json`,'utf8'));
async function all(table,key='id'){const rows=[];for(let offset=0;;offset+=1000){const page=await rest(config,`${table}?select=*&order=${key}.asc&limit=1000&offset=${offset}`);rows.push(...page);if(page.length<1000)return rows;}}
const persisted=await all('resources'),sources=await all('resource_sources'),metrics=await all('resource_metric_snapshots');
const selected=persisted.filter(x=>x.import_metadata.creatorCatalog?.selected);
if(selected.length!==100)throw Error(`Selected count ${selected.length}`);
for(const expected of catalog.resources){
  const actual=selected.find(x=>x.external_identity===expected.identity);if(!actual)throw Error(`Missing ${expected.name}`);
  for(const field of ['name','type','tagline','description','long_description','canonical_url','repository_url','documentation_url','owner_name','license'])if(actual[field]!==expected[field])throw Error(`Read-back mismatch ${field}: ${expected.name}`);
  if(actual.status!=='CANDIDATE'||!isDeepStrictEqual(actual.import_metadata.creatorCatalog,expected.import_metadata.creatorCatalog))throw Error(`Changed status/brief ${expected.name}`);
  for(const source of expected.sources)if(!sources.some(x=>x.resource_id===actual.id&&x.source_type===source.source_type&&x.source_identifier===source.source_identifier&&x.source_url===source.source_url))throw Error(`Missing source ${expected.name}`);
  const g=expected.import_metadata.creatorCatalog.github;
  for(const key of ['stars','forks'])if(!metrics.some(x=>x.resource_id===actual.id&&x.metric_key===key&&Number(x.metric_value)===g[key]&&Date.parse(x.captured_at)===Date.parse(g.observedAt)))throw Error(`Missing metric ${expected.name}`);
}
for(const row of before)if(!persisted.some(x=>x.id===row.id))throw Error('Previous resource deleted');
for(const table of ['resource_sources','resource_metric_snapshots','resource_community_evidence','resource_evidence_media']){
  const previous=JSON.parse(await readFile(`${manifest.snapshotDirectory}/${table}.json`,'utf8'));
  const after=table==='resource_sources'?sources:table==='resource_metric_snapshots'?metrics:await all(table);
  if(previous.some(p=>!after.some(a=>a.id===p.id)))throw Error(`Previous history deleted: ${table}`);
}
const local=parse(await readFile('.env.local','utf8')),env={...local,...process.env};
const anonKey=env.NEXT_PUBLIC_SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY;
if(!anonKey)throw Error('Missing public key for anonymous verification');
const anon=await rest({...config,key:anonKey},'resources?select=id');
if(anon.length!==0)throw Error('Unreviewed candidates leaked to anonymous visitors');
const report={projectRef:config.projectRef,verifiedAt:new Date().toISOString(),contentHash:catalog.contentHash,selectedCount:100,completeBriefs:100,primarySourceCoverage:100,metricCoverage:100,techCount:selected.filter(x=>x.import_metadata.creatorCatalog.primaryCategory==='tech').length,statuses:Object.fromEntries(['CANDIDATE','ARCHIVED','PUBLISHED'].map(s=>[s,persisted.filter(x=>x.status===s).length])),sourceCount:sources.length,metricCount:metrics.length,anonymousVisible:anon.length,allPreviousResourceIdsPreserved:true,previousSourceMetricEvidenceIdsPreserved:true,snapshotDirectory:manifest.snapshotDirectory};
await atomicJson('data/catalog/creator-database-report.json',report);console.log(JSON.stringify(report,null,2));
