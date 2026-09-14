import {test} from 'node:test';
import {readdir,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
test('every shipped JavaScript installer parses as JavaScript before packaging',async()=>{
  const directory=new URL('../scripts/',import.meta.url);
  for(const name of await readdir(directory))if(name.endsWith('.mjs'))execFileSync(process.execPath,['--check',fileURLToPath(new URL(name,directory))],{stdio:'pipe'});
});
test('production lockfiles include native dependencies for Windows and both Mac architectures',async()=>{
  const renderer=JSON.parse(await readFile(new URL('../../../kits/video-starter/package-lock.json',import.meta.url),'utf8'));
  for(const target of ['darwin-arm64','darwin-x64','win32-x64-msvc'])assert.ok(renderer.packages[`node_modules/@remotion/compositor-${target}`]?.integrity);
});
