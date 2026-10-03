import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  throw new Error('Usage: node scripts/publish-video-workflow-release.mjs VERSION');
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error('Missing Supabase release credentials');

const fileName = `Windi-Video-Workflow-v${version}-universal.zip`;
const file = path.join(root, 'tools', 'windi-connect', 'dist', fileName);
const bytes = await readFile(file);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const storagePath = `windi-video-workflow/${version}/${fileName}`;
const changelog = (await readFile(path.join(root, 'docs/windi-video-workflow', `CHANGELOG-${version}.txt`), 'utf8')).trim();
if (!changelog) throw new Error('Missing reviewed release changelog');
const db = createClient(url, serviceRole, { auth: { persistSession: false } });
const sku = 'windi-video-workflow-v1';

const { data: product, error: productError } = await db
  .from('products')
  .select('id,metadata')
  .eq('metadata->>sku', sku)
  .maybeSingle();
if (productError || !product) throw productError ?? new Error(`Missing product: ${sku}`);

const { data: existing, error: existingError } = await db
  .from('product_releases')
  .select('id')
  .eq('product_id', product.id)
  .eq('version', version)
  .maybeSingle();
if (existingError) throw existingError;
if (existing) throw new Error(`Release ${version} already exists; choose a new semantic version.`);

const { error: uploadError } = await db.storage.from('windi-releases').upload(storagePath, bytes, {
  contentType: 'application/zip',
  cacheControl: '31536000',
  upsert: false,
});
if (uploadError) throw uploadError;

const { data: remote, error: downloadError } = await db.storage.from('windi-releases').download(storagePath);
if (downloadError || !remote) throw downloadError ?? new Error('Release object missing after upload');
const verified = Buffer.from(await remote.arrayBuffer());
if (verified.length !== bytes.length || createHash('sha256').update(verified).digest('hex') !== sha256) {
  throw new Error('Remote release verification failed');
}

const { data: release, error: releaseError } = await db
  .from('product_releases')
  .insert({
    product_id: product.id,
    version,
    storage_bucket: 'windi-releases',
    storage_path: storagePath,
    sha256,
    size_bytes: bytes.length,
    changelog,
    is_published: true,
  })
  .select('id,version,storage_path,sha256,size_bytes,is_published')
  .single();
if (releaseError || !release) throw releaseError ?? new Error('Release row was not created');

const { error: productUpdateError } = await db
  .from('products')
  .update({ is_active: true, metadata: { ...product.metadata, release_ready: true } })
  .eq('id', product.id);
if (productUpdateError) throw productUpdateError;

console.log(JSON.stringify({ ...release, changelog }));
