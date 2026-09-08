import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseConfig } from './import-catalog.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const config = await databaseConfig();
const payload = JSON.parse(await readFile(resolve(root, 'data/catalog/easy-prompts.json'), 'utf8'));
const payloadHash = createHash('sha256').update(JSON.stringify(payload.prompts)).digest('hex');
const runKey = `easy-prompt:${payload.catalogHash}:${payload.composerVersion}:${payloadHash.slice(0, 16)}`;
const response = await fetch(`${config.url}/rest/v1/rpc/sync_windi_easy_prompts`, {
  method: 'POST', headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ payload: payload.prompts, run_key: runKey, payload_hash: payloadHash }),
});
if (!response.ok) throw new Error(`Easy Prompt sync failed (${response.status}): ${await response.text()}`);
console.log(JSON.stringify(await response.json(), null, 2));
