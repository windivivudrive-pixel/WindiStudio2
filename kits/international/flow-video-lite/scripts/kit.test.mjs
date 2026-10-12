import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,symlink,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {check,init,localAsset,presets,root,srt,validatePlan} from './kit.mjs';

test('all presets have valid timelines and nonempty scene-level captions',async()=>{
  for(const name of presets){const plan=JSON.parse(await readFile(path.join(root,'presets',`${name}.json`),'utf8'));const {frames}=validatePlan(plan);assert.ok(frames>0);assert.ok(srt(plan).includes('00:00:00,000 --> 00:00:04,000'));}
});
test('invalid timing and duplicate IDs are rejected',async()=>{
  const original=JSON.parse(await readFile(path.join(root,'data/video.json'),'utf8'));
  const plan=structuredClone(original);plan.scenes[0].duration=.5;assert.throws(()=>validatePlan(plan),/duration/);
  const duplicate=structuredClone(original);duplicate.scenes[1].id=duplicate.scenes[0].id;assert.throws(()=>validatePlan(duplicate),/Duplicate/);
});
test('new project copies only kit files and preserves existing projects',async()=>{
  const temporary=await mkdtemp(path.join(os.tmpdir(),'flow-lite-'));
  try{const destination=path.join(temporary,'Project with spaces');await init(destination,'saas-demo');assert.equal((await check(destination)).seconds,20);assert.ok((await readFile(path.join(destination,'.agents/skills/windi-flow-video-lite/SKILL.md'),'utf8')).includes('windi-flow-video-lite'));await writeFile(path.join(destination,'keep.txt'),'keep');await assert.rejects(init(destination),/never overwritten/);assert.equal(await readFile(path.join(destination,'keep.txt'),'utf8'),'keep');await assert.rejects(readFile(path.join(destination,'seller/LISTING.md')));}
  finally{await rm(temporary,{recursive:true,force:true});}
});
test('remote, traversal, incompatible and symlink escape assets are rejected',async()=>{
  const temporary=await mkdtemp(path.join(os.tmpdir(),'flow-assets-'));
  try{await mkdir(path.join(temporary,'public/assets'),{recursive:true});await writeFile(path.join(temporary,'outside.png'),'fixture');await writeFile(path.join(temporary,'public/assets/image.png'),'fixture');await localAsset(temporary,'assets/image.png','image');await assert.rejects(localAsset(temporary,'https://example.com/p.png','image'));await assert.rejects(localAsset(temporary,'assets/../outside.png','image'));await assert.rejects(localAsset(temporary,'assets/image.png','video'),/incompatible/);if(process.platform!=='win32'){await symlink(path.join(temporary,'outside.png'),path.join(temporary,'public/assets/escape.png'));await assert.rejects(localAsset(temporary,'assets/escape.png','image'),/escapes/);}}
  finally{await rm(temporary,{recursive:true,force:true});}
});
