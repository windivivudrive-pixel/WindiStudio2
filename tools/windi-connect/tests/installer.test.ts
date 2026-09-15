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
test('installer preserves an existing shared watch skill and makes Windows success visible',async()=>{
  const installer=await readFile(new URL('../scripts/install.mjs',import.meta.url),'utf8');
  const windowsInstaller=await readFile(new URL('../scripts/windows-install.mjs',import.meta.url),'utf8');
  const releasePackager=await readFile(new URL('../scripts/package-release.mjs',import.meta.url),'utf8');
  const bootstrap=await readFile(new URL('../scripts/bootstrap.ps1',import.meta.url),'utf8');
  assert.match(installer,/lstat\(target\)/);
  assert.match(installer,/status:'kept-existing'/);
  assert.doesNotMatch(installer,/rm\(target,\{recursive:true,force:true\}\).*cp\(bundledWatch,target/s);
  assert.match(installer,/watchSkills\}\);process\.exit\(0\)/);
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
