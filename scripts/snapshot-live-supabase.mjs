import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { databaseConfig, rest } from './import-catalog.mjs';

const PUBLIC_TABLES = ['branding','campaign_registrations','categories','generations','library_images','profiles','promo_codes','transactions','user_used_promos'];
async function allRows(config, table) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await rest(config, `${table}?select=*&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
async function storageBuckets(config) {
  const response = await fetch(`${config.url}/storage/v1/bucket`, { headers: {apikey:config.key, Authorization:`Bearer ${config.key}`}, signal:AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Storage manifest failed (${response.status})`);
  return response.json();
}
async function main() {
  const config = await databaseConfig();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = resolve('.backups/windi', `pre-catalog-${stamp}`);
  await mkdir(directory, {recursive:true, mode:0o700});
  const schema = await rest(config, '');
  await writeFile(join(directory, 'openapi-schema.json'), JSON.stringify(schema, null, 2), {mode:0o600});
  const manifest = {projectRef:config.projectRef, capturedAt:new Date().toISOString(), tables:{}, storageBuckets:await storageBuckets(config), notice:'Local pre-migration snapshot. Files are not copied from Storage; no Auth rows are exported.'};
  for (const table of PUBLIC_TABLES) {
    const rows = await allRows(config, table);
    manifest.tables[table] = {rows:rows.length};
    await writeFile(join(directory, `${table}.json`), JSON.stringify(rows, null, 2), {mode:0o600});
  }
  await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2), {mode:0o600});
  console.log(JSON.stringify({directory, tables:manifest.tables, storageBucketCount:manifest.storageBuckets.length}, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
