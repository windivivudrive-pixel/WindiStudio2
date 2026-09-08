import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { databaseConfig, rest } from './import-catalog.mjs';

async function main() {
  const catalog = JSON.parse(await readFile('data/catalog/creator-100.json', 'utf8'));
  const snapshotDir = process.argv[2];
  if (!snapshotDir || !resolve(snapshotDir).startsWith(resolve('.backups/windi') + '/')) throw new Error('Supply the current local catalog snapshot directory');
  const manifest = JSON.parse(await readFile(`${snapshotDir}/manifest.json`, 'utf8'));
  if (manifest.projectRef !== 'zpjphixcttehkkgxlmsn' || manifest.tables.resources !== 295) throw new Error('Unexpected snapshot; refusing to update');
  const before = JSON.parse(await readFile(`${snapshotDir}/resources.json`, 'utf8'));
  const selectedBefore = before.filter(row => row.import_metadata?.creatorCatalog?.edition === 'creator-100-v1' && row.import_metadata?.creatorCatalog?.selected === true);
  if (selectedBefore.length !== 100 || selectedBefore.some(row => row.status !== 'CANDIDATE' || row.editorial_revision !== 1)) throw new Error('Selected catalog is no longer the untouched candidate set');
  if (catalog.count !== 100 || catalog.resources.length !== 100) throw new Error('Expected exactly 100 creator dossiers');

  const config = await databaseConfig();
  const current = await rest(config, 'resources?select=id,external_identity,status,editorial_revision,name,tagline,description,long_description,import_metadata&limit=1000');
  const textFields = ['name', 'tagline', 'description', 'long_description'];
  for (const expected of catalog.resources) {
    const old = selectedBefore.find(row => row.external_identity === expected.identity);
    const now = current.find(row => row.id === old?.id);
    if (!old || !now) throw new Error(`Missing snapshot row for ${expected.identity}`);
    if (now.status !== 'CANDIDATE' || now.editorial_revision !== 1) throw new Error(`Candidate changed since snapshot: ${expected.identity}`);
    if (textFields.some(field => now[field] !== old[field])) throw new Error(`Candidate copy changed since snapshot: ${expected.identity}`);
  }

  let updated = 0;
  for (const expected of catalog.resources) {
    const old = selectedBefore.find(row => row.external_identity === expected.identity);
    const metadata = {...old.import_metadata,...expected.import_metadata,creatorImportHash:catalog.contentHash,humanizedAt:new Date().toISOString()};
    const result = await rest(config, `resources?id=eq.${old.id}&status=eq.CANDIDATE&editorial_revision=eq.1`, {
      method: 'PATCH', headers: {Prefer: 'return=representation'},
      body: JSON.stringify({tagline:expected.tagline,description:expected.description,long_description:expected.long_description,import_metadata:metadata,updated_at:new Date().toISOString()}),
    });
    if (!Array.isArray(result) || result.length !== 1) throw new Error(`Safe update did not affect exactly one row: ${expected.identity}`);
    updated += 1;
  }
  const report = {projectRef:config.projectRef,updatedAt:new Date().toISOString(),snapshotDirectory:resolve(snapshotDir),contentHash:catalog.contentHash,updatedCount:updated,publishedCount:0,revisionPreserved:true,sourceDataPreserved:true,humanizer:'blader/humanizer 2.11.2 principles applied to prose only; claims, numbers, URLs and link targets preserved'};
  await writeFile('data/catalog/creator-humanizer-update-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
