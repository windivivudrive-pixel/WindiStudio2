import {test} from 'node:test';
import assert from 'node:assert/strict';
import {realpath,mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {flowAspectFromPrompt} from '../src/providers.ts';
import {cleanupDownloadedOriginal,inspectOriginal} from '../src/assets.ts';
test('prompt ratios reach the Flow enum; ambiguous and unsupported requests fail',()=>{
  for(const [ratio,aspect] of Object.entries({'16:9':'landscape','9:16':'portrait','1:1':'square','3:4':'3x4','4:3':'4x3'}))assert.equal(flowAspectFromPrompt(`Create image, ratio ${ratio}`),aspect);
  assert.equal(flowAspectFromPrompt('ratio 16 × 9'),'landscape');
  assert.equal(flowAspectFromPrompt('A landscape photograph'),'landscape');
  assert.equal(flowAspectFromPrompt('A cat'),'portrait');
  assert.throws(()=>flowAspectFromPrompt('ratio 21:9'),/Flow hỗ trợ/);
  assert.throws(()=>flowAspectFromPrompt('16:9 and 9:16'),/nhiều tỷ lệ/);
});
test('cleanup requires matching published bytes and never removes outside Downloads',async()=>{
  const root=await realpath(await mkdtemp(path.join(tmpdir(),'windi-cleanup-')));
  try{
    const downloads=path.join(root,'Downloads');await mkdir(downloads);
    const data=Buffer.alloc(100);Buffer.from([137,80,78,71,13,10,26,10]).copy(data);data.write('IHDR',12);data.writeUInt32BE(10,16);data.writeUInt32BE(10,20);
    const source=path.join(downloads,'image.png'),published=path.join(root,'project.png');
    await writeFile(source,data);await writeFile(published,data);const info=await inspectOriginal(source);
    assert.equal(await cleanupDownloadedOriginal(source,published,'wrong',downloads),false);
    assert.equal(await cleanupDownloadedOriginal(published,source,info.sha256,downloads),false);
    assert.equal(await cleanupDownloadedOriginal(source,published,info.sha256,downloads),true);
    await assert.rejects(readFile(source),{code:'ENOENT'});assert.deepEqual(await readFile(published),data);
  }finally{await rm(root,{recursive:true,force:true});}
});
