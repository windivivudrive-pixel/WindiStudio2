import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {loadProfile,profileWriter} from '../src/profile-file.ts';

test('corrupt profile is backed up and recoverable without losing project data',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'windi-profile-'));
  try{
    const file=path.join(dir,'profile.json');
    const broken='{"chatgpt":"abc","grok":"def"} flow":"old"}';
    await writeFile(file,broken);
    assert.deepEqual(await loadProfile(file),{});
    const backups=await readdir(dir);
    assert.equal(backups.length,1);
    assert.equal(await readFile(path.join(dir,backups[0]),'utf8'),broken);
    await profileWriter(file)({flow:'new'});
    assert.deepEqual(await loadProfile(file),{flow:'new'});
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('concurrent profile writes produce one complete latest JSON document',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'windi-profile-'));
  try{
    const file=path.join(dir,'profile.json');
    assert.deepEqual(await loadProfile(file),{});
    const save=profileWriter(file);
    await Promise.all(Array.from({length:100},(_,i)=>save({chatgpt:'x'.repeat(100-i),flow:String(i)})));
    assert.deepEqual(await loadProfile(file),{chatgpt:'x',flow:'99'});
    assert.deepEqual(await readdir(dir),['profile.json']);
  }finally{await rm(dir,{recursive:true,force:true});}
});
