import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {allocateRelease} from '../scripts/release-directory.mjs';

test('Windows retries isolate dependencies and preserve the live release',async()=>{
  const home=await mkdtemp(path.join(tmpdir(),'windi-install-test-'));
  try {
    const live=path.join(home,'releases','0.6.3');
    await mkdir(live,{recursive:true});
    await writeFile(path.join(live,'locked-native.node'),'original');
    const first=await allocateRelease(home,'0.6.3',{windows:true});
    await writeFile(path.join(first,'partial-install'),'failed');
    const retry=await allocateRelease(home,'0.6.3',{windows:true});
    assert.notEqual(first,retry);
    assert.notEqual(retry,live);
    assert.equal(await readFile(path.join(live,'locked-native.node'),'utf8'),'original');
    assert.equal(await allocateRelease(home,'0.6.3'),live);
    assert.equal(await allocateRelease(home,'0.6.3',{windows:true,target:live}),live);
  } finally { await rm(home,{recursive:true,force:true}); }
});
