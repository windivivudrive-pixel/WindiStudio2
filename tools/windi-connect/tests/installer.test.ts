import {test} from 'node:test';
import {readdir,readFile,mkdtemp,mkdir,writeFile,symlink,rm,readlink} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
test('every shipped JavaScript installer parses as JavaScript before packaging',async()=>{
  const directory=new URL('../scripts/',import.meta.url);
  for(const name of await readdir(directory))if(name.endsWith('.mjs'))execFileSync(process.execPath,['--check',fileURLToPath(new URL(name,directory))],{stdio:'pipe'});
});
test('Node runtime relocates dangling npm shortcuts and survives reinstall and temporary cleanup',async()=>{
 // @ts-ignore Shared installer module.
 const {copyNodeRuntime}=await import('../scripts/node-runtime.mjs');
 const root=await mkdtemp(path.join(tmpdir(),'windi-node-copy-')),source=path.join(root,'source'),target=path.join(root,'target');
 await mkdir(path.join(source,'bin'),{recursive:true});await mkdir(path.join(source,'lib/node_modules/npm/bin'),{recursive:true});
 for(const name of ['npm','npx']){await writeFile(path.join(source,`lib/node_modules/npm/bin/${name}-cli.js`),name);await symlink('/gone/temporary/'+name,path.join(source,'bin',name));}
 await copyNodeRuntime(source,target,{windows:false});await copyNodeRuntime(source,target,{windows:false});await rm(source,{recursive:true});
 assert.equal(await readFile(path.join(target,'bin/npm'),'utf8'),'npm');assert.equal(await readFile(path.join(target,'bin/npx'),'utf8'),'npx');
 assert.equal(await readlink(path.join(target,'bin/npm')),'../lib/node_modules/npm/bin/npm-cli.js');
});
test('production lockfiles include native dependencies for Windows and both Mac architectures',async()=>{
  const renderer=JSON.parse(await readFile(new URL('../../../kits/video-starter/package-lock.json',import.meta.url),'utf8'));
  for(const target of ['darwin-arm64','darwin-x64','win32-x64-msvc'])assert.ok(renderer.packages[`node_modules/@remotion/compositor-${target}`]?.integrity);
});
test('installer preserves an existing shared watch skill and makes Windows success visible',async()=>{
  const installer=await readFile(new URL('../scripts/install.mjs',import.meta.url),'utf8');
  const windowsInstaller=await readFile(new URL('../scripts/windows-install.mjs',import.meta.url),'utf8');
  const releasePackager=await readFile(new URL('../scripts/package-release.mjs',import.meta.url),'utf8');
  const bootstrap=await readFile(new URL('../scripts/bootstrap.ps1',import.meta.url),'utf8');
  assert.match(installer,/lstat\(target\)/);
  assert.match(installer,/status:'kept-existing'/);
  assert.doesNotMatch(installer,/rm\(target,\{recursive:true,force:true\}\).*cp\(bundledWatch,target/s);
  assert.match(installer,/watchSkills\}\);process\.exit\(0\)/);
  assert.match(installer,/await probeDaemon\(socketPath\)/);
  assert.doesNotMatch(installer,/src\/cli\.ts'\),'doctor'/);
  assert.match(windowsInstaller,/path\.join\(bin,'Windi Connect Extension'\)/);
  assert.match(windowsInstaller,/cp\(path\.join\(home,'extensions','windi'\),visibleExtension/);
  assert.match(releasePackager,/add\(path\.join\(root,'dist\/extensions\/windi'\),'Windi Connect Extension\/'\)/);
  assert.match(releasePackager,/Chọn “Load unpacked”, rồi chọn thư mục “Windi Connect Extension”/);
  assert.match(releasePackager,/BƯỚC 1 — CÀI Windi Connect/);
  assert.match(releasePackager,/BƯỚC 2 — NẠP EXTENSION VÀO TRÌNH DUYỆT/);
  assert.match(releasePackager,/BƯỚC 3 — KIỂM TRA VÀ BẮT ĐẦU DÙNG/);
  assert.match(bootstrap,/Windi Connect installed successfully\./);
  assert.match(bootstrap,/Read-Host 'Press Enter to close'/);
});
