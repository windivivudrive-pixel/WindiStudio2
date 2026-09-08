import {databaseConfig,rest} from './import-catalog.mjs';
import {buildEasyPrompt,validateEasyPrompt,EASY_PROMPT_COMPOSER_VERSION} from './easy-prompt-core.mjs';
import {createHash} from 'node:crypto';

const config=await databaseConfig();
const rows=await rest(config,'resources?select=id,external_identity,type,name,canonical_url,repository_url,documentation_url,license,description,import_metadata&status=eq.PUBLISHED&limit=1000');
const prompts=rows.filter(r=>r.import_metadata?.creatorCatalog).map(r=>buildEasyPrompt({...r,identity:r.external_identity}));
for(const prompt of prompts){const errors=validateEasyPrompt(prompt);if(errors.length)throw Error(errors.join(', '));}
const digest=createHash('sha256').update(JSON.stringify(prompts)).digest('hex');
const result=await rest(config,'rpc/sync_windi_easy_prompts',{method:'POST',body:JSON.stringify({payload:prompts,run_key:`nontech-prompts:${digest}`,payload_hash:digest})});
const publishedIds = new Set(rows.map(r => r.id));
const verified = (await rest(config, `resource_easy_prompts?select=resource_id,composer_version,status&composer_version=eq.${EASY_PROMPT_COMPOSER_VERSION}&status=eq.GENERATED`)).filter(v => publishedIds.has(v.resource_id));
if (verified.length !== prompts.length) throw Error(`Prompt read-back count mismatch: verified ${verified.length} vs expected ${prompts.length}`);
console.log(JSON.stringify({ result, verified: verified.length }));
