import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {databaseConfig,rest} from './import-catalog.mjs';
const config=await databaseConfig();
if(config.projectRef!=='zpjphixcttehkkgxlmsn')throw Error('Wrong project');
const directory=resolve('.backups/windi',`pre-creator100-${new Date().toISOString().replace(/[:.]/g,'-')}`);
await mkdir(directory,{recursive:true,mode:0o700});
const manifest={projectRef:config.projectRef,capturedAt:new Date().toISOString(),directory,tables:{},notice:'Catalog data and Data API schema snapshot only. No Auth/payment/Storage content is modified or deleted by this operation.'};
await writeFile(join(directory,'openapi-schema.json'),JSON.stringify(await rest(config,'')),{mode:0o600});
for(const table of ['resources','resource_sources','resource_metric_snapshots','resource_evidence_jobs','resource_import_runs','resource_community_evidence','resource_evidence_media','resource_editorial_actions','editorial_members']){
  const rows=[];const key=table==='resource_evidence_jobs'?'resource_id':table==='resource_import_runs'?'idempotency_key':table==='editorial_members'?'user_id':'id';
  for(let offset=0;;offset+=1000){const page=await rest(config,`${table}?select=*&order=${key}.asc&limit=1000&offset=${offset}`);rows.push(...page);if(page.length<1000)break;}
  await writeFile(join(directory,`${table}.json`),JSON.stringify(rows),{mode:0o600});
  manifest.tables[table]=rows.length;
}
await writeFile(join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
console.log(JSON.stringify(manifest));
